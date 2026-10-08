package com.smscenter.app

import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import java.util.concurrent.TimeUnit

/** Whole-call timeout, including response body. Credentials must never follow redirects. */
class CenterTransport(timeoutMillis: Long) {
    data class Response(val status: Int, val text: String)
    private val client = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS).readTimeout(20, TimeUnit.SECONDS)
        .callTimeout(timeoutMillis, TimeUnit.MILLISECONDS)
        .followRedirects(false).followSslRedirects(false).build()
    fun call(server: String, token: String, path: String, payload: String? = null): Response {
        val request = Request.Builder().url(server.trimEnd('/') + path)
            .header("Authorization", "Bearer $token").header("Accept", "application/json")
        if (payload != null) request.post(payload.toRequestBody("application/json; charset=utf-8".toMediaType()))
        client.newCall(request.build()).execute().use { response ->
            val text = response.body?.charStream()?.use { reader ->
                val buffer = CharArray(32000)
                var size = 0
                while (size < buffer.size) {
                    val count = reader.read(buffer, size, buffer.size - size)
                    if (count < 0) break
                    size += count
                }
                String(buffer, 0, size)
            } ?: "{}"
            return Response(response.code, text)
        }
    }
}
