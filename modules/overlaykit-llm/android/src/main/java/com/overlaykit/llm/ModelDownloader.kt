package com.overlaykit.llm

import android.os.StatFs
import java.io.File
import java.io.FileOutputStream
import java.io.IOException
import java.net.ConnectException
import java.net.HttpURLConnection
import java.net.NoRouteToHostException
import java.net.SocketTimeoutException
import java.net.URL
import java.net.UnknownHostException
import java.security.MessageDigest
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Downloads one model file (D-049). HTTPS only, no token, no other request. The bytes go to
 * `<dest>.part` and are renamed to `<dest>` only after the size and the SHA-256 match. A broken
 * or cancelled transfer keeps the `.part` file, and the next call resumes it with a Range request.
 * A size or hash mismatch deletes the `.part` file.
 */
class ModelDownloader {
  sealed class Outcome {
    data class Ok(val path: String) : Outcome()
    data class Fail(val code: String) : Outcome()
  }

  @Volatile private var cancelled = false
  private val running = AtomicBoolean(false)

  fun cancel() {
    cancelled = true
  }

  fun download(
    url: String,
    dest: File,
    expectedSize: Long,
    expectedSha256: String,
    onProgress: (received: Long, total: Long) -> Unit,
  ): Outcome {
    val start = try {
      URL(url)
    } catch (e: Exception) {
      return Outcome.Fail("BAD_URL")
    }
    if (start.protocol != "https" || expectedSize <= 0 || !SHA_RE.matches(expectedSha256)) {
      return Outcome.Fail("BAD_URL")
    }
    if (!running.compareAndSet(false, true)) return Outcome.Fail("BUSY")
    cancelled = false
    val part = File(dest.path + ".part")
    try {
      val dir = dest.absoluteFile.parentFile ?: return Outcome.Fail("FAILED")
      if (!dir.isDirectory && !dir.mkdirs()) return Outcome.Fail("FAILED")

      // A finished file is checked, not downloaded again. A wrong one is removed.
      if (dest.exists()) {
        if (dest.length() == expectedSize && sha256(dest) == expectedSha256.lowercase()) {
          return Outcome.Ok(dest.path)
        }
        if (cancelled) return Outcome.Fail("CANCELLED")
        dest.delete()
      }

      var retriedFromZero = false
      while (true) {
        var have = if (part.exists()) part.length() else 0L
        if (have > expectedSize) {
          part.delete()
          have = 0L
        }
        if (have < expectedSize) {
          val room = StatFs(dir.path).availableBytes
          if (room < expectedSize - have + SPACE_MARGIN) return Outcome.Fail("NO_SPACE")
          when (val r = fetch(start, part, have, expectedSize, onProgress)) {
            FETCH_DONE -> Unit
            FETCH_RESTART -> {
              if (retriedFromZero) return Outcome.Fail("FAILED")
              retriedFromZero = true
              part.delete()
              continue
            }
            else -> return Outcome.Fail(r)
          }
        }
        break
      }

      val size = part.length()
      if (size != expectedSize) {
        if (size > expectedSize) part.delete()
        return Outcome.Fail(if (size > expectedSize) "SIZE_MISMATCH" else "FAILED")
      }
      val hash = sha256(part) ?: return Outcome.Fail(if (cancelled) "CANCELLED" else "FAILED")
      if (hash != expectedSha256.lowercase()) {
        part.delete()
        return Outcome.Fail("HASH_MISMATCH")
      }
      if (!part.renameTo(dest)) return Outcome.Fail("FAILED")
      return Outcome.Ok(dest.path)
    } catch (e: Exception) {
      return Outcome.Fail("FAILED")
    } finally {
      running.set(false)
    }
  }

  /** Returns FETCH_DONE, FETCH_RESTART, or an error code. */
  private fun fetch(
    start: URL,
    part: File,
    have: Long,
    expectedSize: Long,
    onProgress: (Long, Long) -> Unit,
  ): String {
    var conn: HttpURLConnection? = null
    try {
      var url = start
      var hops = 0
      while (true) {
        val c = url.openConnection() as HttpURLConnection
        conn = c
        c.instanceFollowRedirects = false // each hop is checked to be https
        c.connectTimeout = 20_000
        c.readTimeout = 30_000
        c.setRequestProperty("Accept-Encoding", "identity") // byte ranges must match the file
        if (have > 0) c.setRequestProperty("Range", "bytes=$have-")
        val code = c.responseCode
        if (code in 301..308 && code != 304) {
          val loc = c.getHeaderField("Location") ?: return "HTTP"
          c.disconnect()
          val next = try {
            URL(url, loc)
          } catch (e: Exception) {
            return "BAD_URL"
          }
          if (next.protocol != "https" || ++hops > MAX_HOPS) return "BAD_URL"
          url = next
          continue
        }
        if (code == 416) return FETCH_RESTART
        val append: Boolean
        when (code) {
          206 -> {
            // Content-Range: bytes <start>-<end>/<total>
            val m = RANGE_RE.matchEntire(c.getHeaderField("Content-Range") ?: "") ?: return FETCH_RESTART
            if (m.groupValues[1].toLong() != have || m.groupValues[3].toLong() != expectedSize) {
              return FETCH_RESTART
            }
            append = true
          }
          200 -> {
            if (c.contentLengthLong != expectedSize) return "SIZE_MISMATCH"
            append = false // the server ignored the Range header: start again
          }
          else -> return "HTTP"
        }
        var received = if (append) have else 0L
        var lastEmit = 0L
        FileOutputStream(part, append).use { out ->
          c.inputStream.use { input ->
            val buf = ByteArray(BUFFER)
            while (true) {
              if (cancelled) return "CANCELLED"
              val n = input.read(buf)
              if (n < 0) break
              out.write(buf, 0, n)
              received += n
              val now = System.currentTimeMillis()
              if (now - lastEmit >= 250) {
                lastEmit = now
                onProgress(received, expectedSize)
              }
            }
            out.flush()
            out.fd.sync()
          }
        }
        onProgress(received, expectedSize)
        return FETCH_DONE
      }
    } catch (e: UnknownHostException) {
      return "OFFLINE"
    } catch (e: ConnectException) {
      return "OFFLINE"
    } catch (e: NoRouteToHostException) {
      return "OFFLINE"
    } catch (e: SocketTimeoutException) {
      return "OFFLINE"
    } catch (e: IOException) {
      return "FAILED"
    } finally {
      conn?.disconnect()
    }
  }

  /** Lower-case hex SHA-256, or null when the file can't be read or the download was cancelled. */
  fun sha256(file: File): String? {
    return try {
      val md = MessageDigest.getInstance("SHA-256")
      file.inputStream().use { input ->
        val buf = ByteArray(1 shl 20)
        while (true) {
          if (cancelled && running.get()) return null
          val n = input.read(buf)
          if (n < 0) break
          md.update(buf, 0, n)
        }
      }
      md.digest().joinToString("") { "%02x".format(it) }
    } catch (e: Exception) {
      null
    }
  }

  private companion object {
    const val FETCH_DONE = "DONE"
    const val FETCH_RESTART = "RESTART"
    const val MAX_HOPS = 5
    const val BUFFER = 64 * 1024
    const val SPACE_MARGIN = 256L * 1024 * 1024
    val SHA_RE = Regex("^[0-9a-fA-F]{64}$")
    val RANGE_RE = Regex("bytes (\\d+)-(\\d+)/(\\d+)")
  }
}
