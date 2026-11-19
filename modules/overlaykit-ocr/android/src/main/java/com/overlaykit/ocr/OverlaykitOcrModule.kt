package com.overlaykit.ocr

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.media.ExifInterface
import android.net.Uri
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.Text
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.TextRecognizer
import com.google.mlkit.vision.text.devanagari.DevanagariTextRecognizerOptions
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * On-device text recognition with ML Kit Text Recognition v2, using the bundled
 * Latin and Devanagari models (D-005, D-036). It works on a still file only,
 * makes no network request, and logs no text or image data.
 *
 * It returns raw lines. All interpretation (corner order, script rules, quality
 * rules) happens in TypeScript, in src/modules/ocr.
 */
class OverlaykitOcrModule : Module() {
  private val latin: TextRecognizer by lazy { TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS) }
  private val devanagari: TextRecognizer by lazy {
    TextRecognition.getClient(DevanagariTextRecognizerOptions.Builder().build())
  }

  override fun definition() = ModuleDefinition {
    Name("OverlaykitOcr")

    // Loads both bundled models by reading a small blank bitmap. Resolves true when both load.
    AsyncFunction("load") { promise: Promise ->
      val blank = InputImage.fromBitmap(Bitmap.createBitmap(64, 64, Bitmap.Config.ARGB_8888), 0)
      latin.process(blank)
        .addOnSuccessListener {
          devanagari.process(blank)
            .addOnSuccessListener { promise.resolve(true) }
            .addOnFailureListener { promise.resolve(false) }
        }
        .addOnFailureListener { promise.resolve(false) }
    }

    // Reads one still file. Rotation is already applied to the pixels by the camera, so the
    // bitmap is read with rotation 0, and its size and EXIF orientation are returned so the
    // caller can check that the pixels really are upright (R3.4).
    AsyncFunction("recognizeStill") { uri: String, promise: Promise ->
      val path = Uri.parse(uri).path
      if (path == null) {
        promise.reject(CodedException("INVALID_URI", "Not a file uri", null))
        return@AsyncFunction
      }
      val bitmap = BitmapFactory.decodeFile(path)
      if (bitmap == null) {
        promise.reject(CodedException("DECODE_FAILED", "Could not decode the still", null))
        return@AsyncFunction
      }
      val exif = try {
        ExifInterface(path).getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL)
      } catch (e: Exception) {
        ExifInterface.ORIENTATION_NORMAL
      }
      val image = InputImage.fromBitmap(bitmap, 0)
      latin.process(image)
        .addOnSuccessListener { latinText ->
          devanagari.process(image)
            .addOnSuccessListener { devanagariText ->
              promise.resolve(
                mapOf(
                  "imageWidth" to bitmap.width,
                  "imageHeight" to bitmap.height,
                  "exifOrientation" to exif,
                  "lines" to lines(latinText, "latin") + lines(devanagariText, "devanagari"),
                )
              )
              bitmap.recycle()
            }
            .addOnFailureListener { e ->
              bitmap.recycle()
              promise.reject(CodedException("RECOGNITION_FAILED", e.javaClass.simpleName, null))
            }
        }
        .addOnFailureListener { e ->
          bitmap.recycle()
          promise.reject(CodedException("RECOGNITION_FAILED", e.javaClass.simpleName, null))
        }
    }
  }

  private fun lines(text: Text, recognizer: String): List<Map<String, Any?>> =
    text.textBlocks.flatMap { block ->
      block.lines.map { line ->
        mapOf(
          "text" to line.text,
          "corners" to line.cornerPoints?.map { mapOf("x" to it.x.toDouble(), "y" to it.y.toDouble()) },
          "box" to line.boundingBox?.let {
            mapOf("left" to it.left.toDouble(), "top" to it.top.toDouble(), "right" to it.right.toDouble(), "bottom" to it.bottom.toDouble())
          },
          "confidence" to line.confidence.toDouble(),
          "angle" to line.angle.toDouble(),
          "language" to line.recognizedLanguage,
          "recognizer" to recognizer,
        )
      }
    }
}
