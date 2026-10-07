package com.smscenter.app

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import org.json.JSONObject
import java.security.MessageDigest

class QueueDb(context: Context) : SQLiteOpenHelper(context.applicationContext, "encrypted_queue.db", null, 1) {
    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL("CREATE TABLE queue (id TEXT PRIMARY KEY, signature TEXT NOT NULL, payload TEXT, received_at INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0, error TEXT NOT NULL DEFAULT '')")
        db.execSQL("CREATE INDEX queue_status ON queue(status,received_at)")
    }
    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) = Unit
    fun enqueue(sender: String, body: String, timestamp: Long, extraKeywords: String): Boolean {
        val normalized = java.text.Normalizer.normalize(body, java.text.Normalizer.Form.NFKC)
        val lower = normalized.lowercase(java.util.Locale.ROOT)
        val keywords = listOf("验证码", "校验码", "动态码", "动态密码", "短信密码", "验证代码", "一次性密码", "verification code", "security code", "one-time password", "one time password", "one-time code", "passcode", "otp", "code") + extraKeywords.split(',', '，', '\n').map { it.trim().lowercase(java.util.Locale.ROOT) }.filter { it.isNotEmpty() }
        // Server performs final extraction; phone only screens candidates to allow custom lengths/alphanumeric codes.
        if (keywords.none { lower.contains(it) } || !Regex("[0-9]").containsMatchIn(normalized)) return false
        val id = MessageDigest.getInstance("SHA-256").digest("$sender\u0000$timestamp\u0000$body".toByteArray()).joinToString("") { "%02x".format(it) }
        val signature = Regex("【([^【】\\r\\n]{1,64})】|\\[([^\\[\\]\\r\\n]{1,64})\\]").find(normalized)?.let { it.groupValues[1].ifEmpty { it.groupValues[2] }.trim() } ?: sender
        val payload = JSONObject().put("clientMessageId", id).put("sender", sender.take(64)).put("body", body.take(4096)).put("receivedAt", timestamp).toString()
        val values = ContentValues().apply { put("id", id); put("signature", signature); put("payload", SecureStore.encrypt(payload, id)); put("received_at", timestamp) }
        return writableDatabase.insertWithOnConflict("queue", null, values, SQLiteDatabase.CONFLICT_IGNORE) != -1L
    }
    data class Item(val id: String, val payload: String)
    fun pending(): List<Item> = readableDatabase.rawQuery("SELECT id,payload FROM queue WHERE status='pending' ORDER BY received_at LIMIT 50", null).use { cursor ->
        buildList { while (cursor.moveToNext()) add(Item(cursor.getString(0), cursor.getString(1))) }
    }
    fun complete(id: String, status: String, error: String = "") {
        writableDatabase.update("queue", ContentValues().apply { put("status", status); putNull("payload"); put("error", error.take(200)) }, "id=?", arrayOf(id))
    }
    fun attempted(id: String) { writableDatabase.execSQL("UPDATE queue SET attempts=attempts+1 WHERE id=?", arrayOf(id)) }
    data class Stats(val total: Int, val uploaded: Int, val pending: Int, val rejected: Int)
    fun stats(): Stats = readableDatabase.rawQuery("SELECT COUNT(*),SUM(status='uploaded'),SUM(status='pending'),SUM(status='rejected') FROM queue", null).use { c -> c.moveToFirst(); Stats(c.getInt(0), c.getInt(1), c.getInt(2), c.getInt(3)) }
    data class Recent(val signature: String, val time: Long, val status: String, val error: String)
    fun recent(): List<Recent> = readableDatabase.rawQuery("SELECT signature,received_at,status,error FROM queue ORDER BY received_at DESC LIMIT 12", null).use { c -> buildList { while (c.moveToNext()) add(Recent(c.getString(0), c.getLong(1), c.getString(2), c.getString(3))) } }
    fun cleanup() {
        // Expired payloads are removed locally; the UI reports the rejected metadata.
        val expired = System.currentTimeMillis() - 30L * 86400000L
        writableDatabase.execSQL("UPDATE queue SET status='rejected',payload=NULL,error='超过本地最长保留期限' WHERE status='pending' AND received_at<?", arrayOf(expired))
        writableDatabase.delete("queue", "status!='pending' AND received_at<?", arrayOf(expired.toString()))
    }
}
