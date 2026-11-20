package com.overlaykit.llm

import com.google.ai.edge.litertlm.Backend
import com.google.ai.edge.litertlm.Content
import com.google.ai.edge.litertlm.Contents
import com.google.ai.edge.litertlm.Conversation
import com.google.ai.edge.litertlm.ConversationConfig
import com.google.ai.edge.litertlm.Engine
import com.google.ai.edge.litertlm.EngineConfig
import com.google.ai.edge.litertlm.ExperimentalApi
import com.google.ai.edge.litertlm.ExperimentalFlags
import com.google.ai.edge.litertlm.ResponseFormat
import com.google.ai.edge.litertlm.SamplerConfig
import com.google.ai.edge.litertlm.ThinkingConfig
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.Executors

/**
 * On-device Gemma through LiteRT-LM (D-045), plus the model download (D-049).
 *
 * Rules (design.md "Local Kotlin module"):
 * - One single-thread executor owns the Engine and every Conversation.
 * - generate() makes a fresh Conversation, sends one message, reads the reply, closes it.
 * - Greedy decoding. Thinking, tools and speculative decoding are off.
 * - Nothing is thrown to JavaScript: every failure is a code string.
 * - No prompt, reply or image is logged. The only network use is downloadModel().
 */
@OptIn(ExperimentalApi::class)
class OverlaykitLlmModule : Module() {
  private val worker = Executors.newSingleThreadExecutor { r -> Thread(r, "overlaykit-llm").apply { isDaemon = true } }
  private val downloadWorker = Executors.newSingleThreadExecutor { r -> Thread(r, "overlaykit-llm-dl").apply { isDaemon = true } }
  private val downloader = ModelDownloader()

  // Touched only on `worker`, except `activeConversation` and `activeId`, which cancel() reads.
  private var engine: Engine? = null
  @Volatile private var activeConversation: Conversation? = null
  @Volatile private var activeId: String? = null
  private val cancelledIds = ConcurrentHashMap.newKeySet<String>()

  override fun definition() = ModuleDefinition {
    Name("OverlaykitLlm")
    Events("onDownloadProgress")

    AsyncFunction("load") { modelPath: String, options: Map<String, Any?>, promise: Promise ->
      worker.execute { promise.resolve(loadEngine(modelPath, options)) }
    }

    AsyncFunction("generate") { requestId: String, system: String, user: String, schemaJson: String?, maxOutputTokens: Int, promise: Promise ->
      worker.execute { promise.resolve(runGenerate(requestId, system, user, schemaJson, maxOutputTokens)) }
    }

    Function("cancel") { requestId: String ->
      cancelledIds.add(requestId) // generate() reads this after the reply ends
      if (activeId == requestId) {
        try {
          activeConversation?.cancelProcess()
        } catch (e: Exception) {
          // already finished
        }
      }
    }

    AsyncFunction("release") { promise: Promise ->
      worker.execute {
        closeEngine()
        cancelledIds.clear()
        promise.resolve(null)
      }
    }

    Function("filesDirectory") {
      val dir = appContext.reactContext?.filesDir?.path ?: ""
      if (dir.endsWith("/")) dir else "$dir/"
    }

    // A stat is cheap: it runs here, not on the download worker, so it never waits behind a 2.6 GB hash.
    AsyncFunction("fileSize") { path: String ->
      val f = File(stripScheme(path))
      if (f.isFile) f.length().toDouble() else null
    }

    AsyncFunction("sha256File") { path: String, promise: Promise ->
      downloadWorker.execute { promise.resolve(downloader.sha256(File(stripScheme(path)))) }
    }

    AsyncFunction("downloadModel") { url: String, destPath: String, expectedSize: Double, expectedSha256: String, promise: Promise ->
      downloadWorker.execute {
        val outcome = downloader.download(url, File(stripScheme(destPath)), expectedSize.toLong(), expectedSha256) { got, total ->
          sendEvent("onDownloadProgress", mapOf("receivedBytes" to got.toDouble(), "totalBytes" to total.toDouble()))
        }
        promise.resolve(
          when (outcome) {
            is ModelDownloader.Outcome.Ok -> mapOf("ok" to true, "path" to outcome.path)
            is ModelDownloader.Outcome.Fail -> mapOf("ok" to false, "code" to outcome.code)
          },
        )
      }
    }

    Function("cancelDownload") { downloader.cancel() }

    OnDestroy {
      downloader.cancel()
      worker.execute { closeEngine() }
    }
  }

  private fun stripScheme(path: String) = if (path.startsWith("file://")) path.removePrefix("file://") else path

  private fun fail(code: String) = mapOf("ok" to false, "code" to code)

  private fun loadEngine(modelPath: String, options: Map<String, Any?>): Map<String, Any?> {
    closeEngine()
    val file = File(stripScheme(modelPath))
    if (!file.isFile) return fail("NO_FILE")
    val gpu = options["backend"] == "gpu"
    val maxTokens = (options["maxTokens"] as? Number)?.toInt() ?: 2048
    return try {
      // Speculative decoding off: it failed together with a response format in a user report (issue 3944).
      ExperimentalFlags.enableSpeculativeDecoding = false
      ExperimentalFlags.enableConversationConstrainedDecoding = true
      val config = EngineConfig(
        modelPath = file.path,
        backend = if (gpu) Backend.GPU() else Backend.CPU(),
        maxNumTokens = maxTokens,
        cacheDir = appContext.reactContext?.cacheDir?.path,
      )
      val e = Engine(config)
      try {
        e.initialize()
      } catch (t: Throwable) {
        runCatching { e.close() }
        throw t
      }
      engine = e
      mapOf("ok" to true)
    } catch (t: OutOfMemoryError) {
      fail("OUT_OF_MEMORY")
    } catch (t: UnsatisfiedLinkError) {
      fail("UNSUPPORTED") // no native library for this ABI
    } catch (t: Throwable) {
      val msg = (t.message ?: "").lowercase()
      fail(if (msg.contains("memory") || msg.contains("alloc")) "OUT_OF_MEMORY" else if (msg.contains("unsupported") || msg.contains("not supported")) "UNSUPPORTED" else "FAILED")
    }
  }

  private fun runGenerate(
    requestId: String,
    system: String,
    user: String,
    schemaJson: String?,
    maxOutputTokens: Int,
  ): Map<String, Any?> {
    if (cancelledIds.remove(requestId)) return fail("CANCELLED")
    val e = engine ?: return fail("NOT_LOADED")
    var conversation: Conversation? = null
    return try {
      val withSchema = !schemaJson.isNullOrEmpty()
      conversation = e.createConversation(
        ConversationConfig(
          systemInstruction = Contents.of(system),
          samplerConfig = SamplerConfig(topK = 1, topP = 1.0, temperature = 0.0, seed = 0),
          enableResponseFormat = withSchema,
          maxOutputToken = maxOutputTokens,
          thinkingConfig = ThinkingConfig(enableThinking = false),
        ),
      )
      activeConversation = conversation
      activeId = requestId
      // A cancel that arrived while the conversation was being made.
      if (cancelledIds.remove(requestId)) return fail("CANCELLED")
      val reply = if (withSchema) {
        conversation.sendMessage(user, responseFormat = ResponseFormat.json(schemaJson!!))
      } else {
        conversation.sendMessage(user)
      }
      if (cancelledIds.remove(requestId)) {
        fail("CANCELLED")
      } else {
        val text = reply.contents.contents.filterIsInstance<Content.Text>().joinToString("") { it.text }
        mapOf("ok" to true, "text" to text)
      }
    } catch (t: Throwable) {
      if (cancelledIds.remove(requestId)) fail("CANCELLED") else fail("FAILED")
    } finally {
      activeId = null
      activeConversation = null
      runCatching { conversation?.close() }
    }
  }

  private fun closeEngine() {
    runCatching { activeConversation?.close() }
    activeConversation = null
    runCatching { engine?.close() }
    engine = null
  }
}
