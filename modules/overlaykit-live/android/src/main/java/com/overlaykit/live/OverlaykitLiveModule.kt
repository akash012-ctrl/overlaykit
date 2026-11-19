package com.overlaykit.live

import android.Manifest
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.ExifInterface
import android.media.MediaRecorder
import android.net.Uri
import android.util.Base64
import expo.modules.interfaces.permissions.PermissionsStatus
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.InputStream
import java.util.concurrent.Executors

/**
 * Microphone PCM and JPEG scaling for the opt-in Gemini Live planner (D-050, R16).
 *
 * Rules:
 * - Nothing is thrown to JavaScript: every failure is a code string.
 * - Nothing is written to disk and nothing is logged. No audio or image bytes outlive a call.
 * - RECORD_AUDIO is asked for only inside startMic(), never at launch.
 * - The microphone stops on stopMic(), when the app goes to the background, and when the module is destroyed.
 */
class OverlaykitLiveModule : Module() {
  private val imageWorker = Executors.newSingleThreadExecutor { r -> Thread(r, "overlaykit-live-img").apply { isDaemon = true } }
  private val micLock = Any()
  private var capture: MicCapture? = null

  override fun definition() = ModuleDefinition {
    Name("OverlaykitLive")
    Events("onMicChunk", "onMicStopped")

    AsyncFunction("startMic") { promise: Promise ->
      val permissions = appContext.permissions
      if (permissions == null) {
        promise.resolve(micResult(false, "FAILED"))
        return@AsyncFunction
      }
      if (permissions.hasGrantedPermissions(Manifest.permission.RECORD_AUDIO)) {
        promise.resolve(beginMic())
        return@AsyncFunction
      }
      permissions.askForPermissions({ result ->
        val granted = result[Manifest.permission.RECORD_AUDIO]?.status == PermissionsStatus.GRANTED
        promise.resolve(if (granted) beginMic() else micResult(false, "DENIED"))
      }, Manifest.permission.RECORD_AUDIO)
    }

    Function("stopMic") { endMic("stop") }

    AsyncFunction("scaleJpegBase64") { stillUri: String, maxLongEdge: Int, quality: Int, promise: Promise ->
      imageWorker.execute { promise.resolve(scaleJpeg(stillUri, maxLongEdge, quality)) }
    }

    OnActivityEntersBackground { endMic("background") }
    OnDestroy { endMic("destroy") }
  }

  // region microphone

  private fun micResult(ok: Boolean, code: String? = null): Map<String, Any> =
    if (ok) mapOf("ok" to true) else mapOf("ok" to false, "code" to (code ?: "FAILED"))

  private fun beginMic(): Map<String, Any> {
    synchronized(micLock) {
      if (capture != null) return micResult(true) // already running: one recorder only
      return try {
        val next = MicCapture { bytes -> sendEvent("onMicChunk", mapOf("data" to Base64.encodeToString(bytes, Base64.NO_WRAP))) }
        if (!next.start()) return micResult(false, "FAILED")
        capture = next
        micResult(true)
      } catch (e: Exception) {
        micResult(false, "FAILED")
      }
    }
  }

  private fun endMic(reason: String) {
    val running = synchronized(micLock) {
      val c = capture
      capture = null
      c
    }
    if (running != null) {
      running.stop()
      if (reason != "stop") sendEvent("onMicStopped", mapOf("reason" to reason))
    }
  }

  /** 16 kHz mono 16-bit little-endian PCM in chunks of CHUNK_MS, read on one thread. */
  private class MicCapture(private val onChunk: (ByteArray) -> Unit) {
    @Volatile private var running = false
    private var record: AudioRecord? = null
    private var thread: Thread? = null

    fun start(): Boolean {
      val chunkBytes = SAMPLE_RATE * 2 * CHUNK_MS / 1000
      val minBuffer = AudioRecord.getMinBufferSize(SAMPLE_RATE, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT)
      if (minBuffer <= 0) return false
      val rec = try {
        AudioRecord(
          MediaRecorder.AudioSource.MIC,
          SAMPLE_RATE,
          AudioFormat.CHANNEL_IN_MONO,
          AudioFormat.ENCODING_PCM_16BIT,
          maxOf(minBuffer, chunkBytes * 4),
        )
      } catch (e: Exception) {
        return false
      }
      if (rec.state != AudioRecord.STATE_INITIALIZED) {
        rec.release()
        return false
      }
      try {
        rec.startRecording()
      } catch (e: Exception) {
        rec.release()
        return false
      }
      record = rec
      running = true
      thread = Thread({
        val buf = ByteArray(chunkBytes)
        while (running) {
          var filled = 0
          while (running && filled < chunkBytes) {
            val n = rec.read(buf, filled, chunkBytes - filled)
            if (n <= 0) { running = false; break }
            filled += n
          }
          if (filled == chunkBytes && running) onChunk(buf.copyOf())
        }
      }, "overlaykit-live-mic").apply { isDaemon = true; start() }
      return true
    }

    fun stop() {
      running = false
      try { record?.stop() } catch (e: Exception) { /* already stopped */ }
      thread?.join(500) // read() returns once stopped; chunks after this point are dropped
      record?.release()
      record = null
      thread = null
    }
  }

  // endregion

  // region JPEG

  private fun openStream(uri: String): InputStream? {
    val context = appContext.reactContext ?: return null
    return try {
      if (uri.startsWith("content://")) {
        context.contentResolver.openInputStream(Uri.parse(uri))
      } else {
        val path = if (uri.startsWith("file://")) Uri.parse(uri).path ?: return null else uri
        val f = File(path)
        if (f.isFile) f.inputStream() else null
      }
    } catch (e: Exception) {
      null
    }
  }

  private fun scaleJpeg(uri: String, maxLongEdge: Int, quality: Int): Map<String, Any> {
    if (maxLongEdge <= 0) return mapOf("ok" to false, "code" to "FAILED")
    // Each pass opens the source again: bounds, EXIF, pixels. Small stills, so simplicity wins.
    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    val first = openStream(uri) ?: return mapOf("ok" to false, "code" to "NO_FILE")
    try { first.use { BitmapFactory.decodeStream(it, null, bounds) } } catch (e: Exception) { return mapOf("ok" to false, "code" to "FAILED") }
    val w = bounds.outWidth
    val h = bounds.outHeight
    if (w <= 0 || h <= 0) return mapOf("ok" to false, "code" to "FAILED")

    val orientation = try {
      openStream(uri)?.use { ExifInterface(it).getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL) }
    } catch (e: Exception) { null } ?: ExifInterface.ORIENTATION_NORMAL

    var sample = 1
    while (maxOf(w, h) / (sample * 2) >= maxLongEdge) sample *= 2
    var decoded: Bitmap? = null
    var oriented: Bitmap? = null
    return try {
      val opts = BitmapFactory.Options().apply { inSampleSize = sample }
      decoded = openStream(uri)?.use { BitmapFactory.decodeStream(it, null, opts) }
        ?: return mapOf("ok" to false, "code" to "FAILED")

      val matrix = Matrix()
      when (orientation) {
        ExifInterface.ORIENTATION_ROTATE_90 -> matrix.postRotate(90f)
        ExifInterface.ORIENTATION_ROTATE_180 -> matrix.postRotate(180f)
        ExifInterface.ORIENTATION_ROTATE_270 -> matrix.postRotate(270f)
        ExifInterface.ORIENTATION_FLIP_HORIZONTAL -> matrix.postScale(-1f, 1f)
        ExifInterface.ORIENTATION_FLIP_VERTICAL -> matrix.postScale(1f, -1f)
        ExifInterface.ORIENTATION_TRANSPOSE -> { matrix.postRotate(90f); matrix.postScale(-1f, 1f) }
        ExifInterface.ORIENTATION_TRANSVERSE -> { matrix.postRotate(270f); matrix.postScale(-1f, 1f) }
      }
      val longEdge = maxOf(decoded.width, decoded.height)
      if (longEdge > maxLongEdge) {
        val s = maxLongEdge.toFloat() / longEdge
        matrix.postScale(s, s)
      }
      oriented = Bitmap.createBitmap(decoded, 0, 0, decoded.width, decoded.height, matrix, true)

      val out = ByteArrayOutputStream()
      val q = quality.coerceIn(1, 100)
      if (!oriented.compress(Bitmap.CompressFormat.JPEG, q, out)) return mapOf("ok" to false, "code" to "FAILED")
      mapOf("ok" to true, "base64" to Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP))
    } catch (e: Throwable) { // OutOfMemoryError included: a code string, not a crash
      mapOf("ok" to false, "code" to "FAILED")
    } finally {
      if (oriented != null && oriented !== decoded) oriented.recycle()
      decoded?.recycle()
    }
  }

  // endregion

  private companion object {
    const val SAMPLE_RATE = 16000
    const val CHUNK_MS = 50
  }
}
