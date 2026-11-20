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
private const val MAX_LONG_EDGE = 2048

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
      // Read at most MAX_LONG_EDGE px on the long side: about 4x fewer pixels for a 12 MP still, so the live loop
      // keeps up. Line coordinates are scaled back, and the full size is reported, so callers see no difference.
      val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
      BitmapFactory.decodeFile(path, bounds)
      var sample = 1
      while (maxOf(bounds.outWidth, bounds.outHeight) / sample > MAX_LONG_EDGE) sample *= 2
      val bitmap = BitmapFactory.decodeFile(path, BitmapFactory.Options().apply { inSampleSize = sample })
      if (bitmap == null || bounds.outWidth <= 0) {
        promise.reject(CodedException("DECODE_FAILED", "Could not decode the still", null))
        return@AsyncFunction
      }
      val exif = try {
        ExifInterface(path).getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL)
      } catch (e: Exception) {
        ExifInterface.ORIENTATION_NORMAL
      }
      val scale = bounds.outWidth.toDouble() / bitmap.width
      val image = InputImage.fromBitmap(bitmap, 0)
      latin.process(image)
        .addOnSuccessListener { latinText ->
          devanagari.process(image)
            .addOnSuccessListener { devanagariText ->
              promise.resolve(
                mapOf(
                  "imageWidth" to bounds.outWidth,
                  "imageHeight" to bounds.outHeight,
                  "exifOrientation" to exif,
                  "lines" to lines(latinText, "latin", scale) + lines(devanagariText, "devanagari", scale),
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

  private fun lines(text: Text, recognizer: String, k: Double): List<Map<String, Any?>> =
    text.textBlocks.flatMap { block ->
      block.lines.map { line ->
        mapOf(
          "text" to line.text,
          "corners" to line.cornerPoints?.map { mapOf("x" to it.x * k, "y" to it.y * k) },
          "box" to line.boundingBox?.let {
            mapOf("left" to it.left * k, "top" to it.top * k, "right" to it.right * k, "bottom" to it.bottom * k)
          },
          "confidence" to line.confidence.toDouble(),
          "angle" to line.angle.toDouble(),
          "language" to line.recognizedLanguage,
          "recognizer" to recognizer,
        )
      }
    }
}
