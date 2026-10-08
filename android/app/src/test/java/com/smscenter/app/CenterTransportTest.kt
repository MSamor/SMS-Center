package com.smscenter.app

import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import okhttp3.mockwebserver.SocketPolicy
import org.junit.Assert.*
import org.junit.Test
import java.io.IOException
import java.util.concurrent.TimeUnit

class CenterTransportTest {
    @Test fun uploadPreservesPayloadAndAuth() {
        MockWebServer().use { server ->
            server.enqueue(MockResponse().setResponseCode(201).setBody("{}"))
            val result = CenterTransport(1000).call(server.url("/").toString(), "test-only", "/api/v1/sms", "{\"test\":true}")
            val request = server.takeRequest(1, TimeUnit.SECONDS)!!
            assertEquals(201, result.status)
            assertEquals("POST", request.method)
            assertEquals("/api/v1/sms", request.path)
            assertEquals("Bearer test-only", request.getHeader("Authorization"))
            assertEquals("{\"test\":true}", request.body.readUtf8())
        }
    }
    @Test fun doesNotForwardCredentialsToRedirectTarget() {
        MockWebServer().use { server ->
            server.enqueue(MockResponse().setResponseCode(302).addHeader("Location", server.url("/unexpected")))
            val result = CenterTransport(1000).call(server.url("/").toString(), "test-only", "/api/v1/device")
            assertEquals(302, result.status)
            assertEquals(1, server.requestCount)
        }
    }
    @Test fun stalledServerIsBoundedByWholeCallTimeout() {
        MockWebServer().use { server ->
            server.enqueue(MockResponse().setSocketPolicy(SocketPolicy.NO_RESPONSE))
            val started = System.nanoTime()
            try {
                CenterTransport(300).call(server.url("/").toString(), "test-only", "/api/v1/sms", "{}")
                fail("Stalled server must time out")
            } catch (_: IOException) {
                assertTrue(TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - started) < 2000)
            }
        }
    }
    @Test fun responseBodyIsCapped() {
        MockWebServer().use { server ->
            server.enqueue(MockResponse().setBody("x".repeat(50000)))
            assertEquals(32000, CenterTransport(1000).call(server.url("/").toString(), "test-only", "/api/v1/device").text.length)
        }
    }
}
