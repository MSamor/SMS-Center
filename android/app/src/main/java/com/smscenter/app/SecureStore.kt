package com.smscenter.app

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.Mac
import javax.crypto.spec.GCMParameterSpec

class SecureStore {
    companion object {
        private const val ALIAS = "sms_center_local_v1"
        @Synchronized private fun key(): SecretKey {
            val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
            (store.getKey(ALIAS, null) as? SecretKey)?.let { return it }
            return KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore").apply {
                init(KeyGenParameterSpec.Builder(ALIAS, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
                    .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build())
            }.generateKey()
        }
        @Synchronized fun fingerprint(value: String): String {
            val alias = "sms_center_dedupe_v1"
            val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
            val key = (store.getKey(alias, null) as? SecretKey) ?: KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_HMAC_SHA256, "AndroidKeyStore").apply {
                init(KeyGenParameterSpec.Builder(alias, KeyProperties.PURPOSE_SIGN).setDigests(KeyProperties.DIGEST_SHA256).build())
            }.generateKey()
            return Mac.getInstance("HmacSHA256").apply { init(key) }.doFinal(value.toByteArray(Charsets.UTF_8))
                .joinToString("") { "%02x".format(it) }
        }
        fun encrypt(value: String, context: String): String {
            val cipher = Cipher.getInstance("AES/GCM/NoPadding").apply { init(Cipher.ENCRYPT_MODE, key()); updateAAD(context.toByteArray()) }
            val bytes = cipher.doFinal(value.toByteArray(Charsets.UTF_8))
            return Base64.encodeToString(cipher.iv, Base64.NO_WRAP) + "." + Base64.encodeToString(bytes, Base64.NO_WRAP)
        }
        fun decrypt(value: String, context: String): String {
            val parts = value.split('.')
            val cipher = Cipher.getInstance("AES/GCM/NoPadding").apply {
                init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(128, Base64.decode(parts[0], Base64.NO_WRAP)))
                updateAAD(context.toByteArray())
            }
            return String(cipher.doFinal(Base64.decode(parts[1], Base64.NO_WRAP)), Charsets.UTF_8)
        }
    }
}

class AppSettings(context: Context) {
    private val prefs = context.getSharedPreferences("sms_center", Context.MODE_PRIVATE)
    var enabled: Boolean
        get() = prefs.getBoolean("enabled", false)
        set(value) {
            val edit = prefs.edit().putBoolean("enabled", value)
            if (value && !enabled) edit.putLong("inboxSince", System.currentTimeMillis()).putLong("inboxLastId", 0)
            edit.apply()
        }
    var server: String
        get() = prefs.getString("server", "") ?: ""
        set(value) { prefs.edit().putString("server", value).apply() }
    var token: String
        get() = prefs.getString("token", null)?.let { SecureStore.decrypt(it, "upload-token") } ?: ""
        set(value) { prefs.edit().putString("token", SecureStore.encrypt(value, "upload-token")).apply() }
    var extraKeywords: String
        get() = prefs.getString("keywords", "") ?: ""
        set(value) { prefs.edit().putString("keywords", value).apply() }
    var lastError: String
        get() = prefs.getString("error", "") ?: ""
        set(value) { prefs.edit().putString("error", value).apply() }
    var inboxSince: Long
        get() = prefs.getLong("inboxSince", 0)
        set(value) { prefs.edit().putLong("inboxSince", value).apply() }
    var inboxLastId: Long
        get() = prefs.getLong("inboxLastId", 0)
        set(value) { prefs.edit().putLong("inboxLastId", value).apply() }
    var lastInboxResult: String
        get() = prefs.getString("lastInboxResult", "尚未检查") ?: ""
        set(value) {
            val time = java.text.SimpleDateFormat("MM-dd HH:mm:ss", java.util.Locale.getDefault()).format(java.util.Date())
            prefs.edit().putString("lastInboxResult", "$time  $value").apply()
        }
    var lastBroadcastSource: String
        get() = prefs.getString("lastBroadcastSource", "尚无") ?: ""
        set(value) { prefs.edit().putString("lastBroadcastSource", value).apply() }
    var lastReceiveResult: String
        get() = prefs.getString("lastReceiveResult", "尚未收到短信广播") ?: ""
        set(value) {
            val time = java.text.SimpleDateFormat("MM-dd HH:mm:ss", java.util.Locale.getDefault()).format(java.util.Date())
            prefs.edit().putString("lastReceiveResult", "$time  $value").apply()
        }
    var lastImportResult: String
        get() = prefs.getString("lastImportResult", "") ?: ""
        set(value) { prefs.edit().putString("lastImportResult", value).apply() }
    var deviceName: String
        get() = prefs.getString("deviceName", "尚未验证连接") ?: ""
        set(value) { prefs.edit().putString("deviceName", value).apply() }
}
