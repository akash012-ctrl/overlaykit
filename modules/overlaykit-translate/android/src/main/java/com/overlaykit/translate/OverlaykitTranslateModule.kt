package com.overlaykit.translate

import com.google.android.gms.tasks.Tasks
import com.google.mlkit.common.model.DownloadConditions
import com.google.mlkit.common.model.RemoteModelManager
import com.google.mlkit.nl.translate.TranslateLanguage
import com.google.mlkit.nl.translate.TranslateRemoteModel
import com.google.mlkit.nl.translate.Translation
import com.google.mlkit.nl.translate.Translator
import com.google.mlkit.nl.translate.TranslatorOptions
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.net.UnknownHostException
import java.util.concurrent.ConcurrentHashMap

/**
 * On-device translation with ML Kit (D-053). The only network use is the one-time language model
 * download from Google; the text to translate never leaves the phone. Nothing is logged.
 */
class OverlaykitTranslateModule : Module() {
  private val translators = ConcurrentHashMap<String, Translator>()
  private val models by lazy { RemoteModelManager.getInstance() }

  private fun language(tag: String): String? = TranslateLanguage.fromLanguageTag(tag)

  private fun translator(source: String, target: String): Translator? {
    val s = language(source) ?: return null
    val t = language(target) ?: return null
    return translators.getOrPut("$s>$t") {
      Translation.getClient(TranslatorOptions.Builder().setSourceLanguage(s).setTargetLanguage(t).build())
    }
  }

  private fun isOffline(e: Exception?): Boolean {
    var c: Throwable? = e
    while (c != null) {
      if (c is UnknownHostException) return true
      c = c.cause
    }
    return false
  }

  override fun definition() = ModuleDefinition {
    Name("OverlaykitTranslate")

    // True when both language models are on the phone already.
    AsyncFunction("isModelReady") { source: String, target: String, promise: Promise ->
      val s = language(source)
      val t = language(target)
      if (s == null || t == null) {
        promise.resolve(false)
        return@AsyncFunction
      }
      models.getDownloadedModels(TranslateRemoteModel::class.java)
        .addOnSuccessListener { downloaded ->
          val codes = downloaded.map { it.language }.toSet()
          promise.resolve(codes.contains(s) && codes.contains(t))
        }
        .addOnFailureListener { promise.resolve(false) }
    }

    // Downloads the models the pair needs. Resolves { ok } or { ok: false, code: OFFLINE | UNSUPPORTED | FAILED }.
    AsyncFunction("downloadModel") { source: String, target: String, promise: Promise ->
      val tr = translator(source, target)
      if (tr == null) {
        promise.resolve(mapOf("ok" to false, "code" to "UNSUPPORTED"))
        return@AsyncFunction
      }
      tr.downloadModelIfNeeded(DownloadConditions.Builder().build())
        .addOnSuccessListener { promise.resolve(mapOf("ok" to true)) }
        .addOnFailureListener { e -> promise.resolve(mapOf("ok" to false, "code" to if (isOffline(e)) "OFFLINE" else "FAILED")) }
    }

    // Translates every text in order. Resolves { ok, texts } or { ok: false, code }.
    AsyncFunction("translate") { texts: List<String>, source: String, target: String, promise: Promise ->
      val tr = translator(source, target)
      if (tr == null) {
        promise.resolve(mapOf("ok" to false, "code" to "UNSUPPORTED"))
        return@AsyncFunction
      }
      Tasks.whenAllSuccess<String>(texts.map { tr.translate(it) })
        .addOnSuccessListener { out -> promise.resolve(mapOf("ok" to true, "texts" to out)) }
        .addOnFailureListener { promise.resolve(mapOf("ok" to false, "code" to "FAILED")) }
    }

    OnDestroy {
      translators.values.forEach { it.close() }
      translators.clear()
    }
  }
}
