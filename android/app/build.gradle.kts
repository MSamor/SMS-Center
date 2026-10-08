plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

val releaseVersion = providers.environmentVariable("SMS_RELEASE_VERSION").orElse("1.0.0")
val releaseCode = providers.environmentVariable("SMS_RELEASE_VERSION_CODE").orElse("1")
val keystorePath = providers.environmentVariable("ANDROID_KEYSTORE_PATH").orNull
val keystorePassword = providers.environmentVariable("ANDROID_KEYSTORE_PASSWORD").orNull
val signingAlias = providers.environmentVariable("ANDROID_KEY_ALIAS").orNull
val signingPassword = providers.environmentVariable("ANDROID_KEY_PASSWORD").orNull
val hasReleaseSigning = listOf(keystorePath, keystorePassword, signingAlias, signingPassword)
    .all { !it.isNullOrBlank() }

android {
    namespace = "com.smscenter.app"
    compileSdk = 35
    defaultConfig {
        applicationId = "com.smscenter.app"
        minSdk = 26
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        targetSdk = 35
        versionCode = releaseCode.get().toInt().also { require(it in 1..2100000000) }
        versionName = releaseVersion.get()
    }
    signingConfigs {
        if (hasReleaseSigning) {
            create("release") {
                storeFile = file(keystorePath!!)
                storePassword = keystorePassword
                keyAlias = signingAlias
                keyPassword = signingPassword
            }
        }
    }
    buildTypes {
        release {
            isMinifyEnabled = false
            if (hasReleaseSigning) signingConfig = signingConfigs.getByName("release")
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

// Debug CI works without secrets; publishable Release builds must never silently be unsigned.
val verifyReleaseSigning = tasks.register("verifyReleaseSigning") {
    doLast {
        require(hasReleaseSigning) { "Release signing requires ANDROID_KEYSTORE_PATH/PASSWORD, ANDROID_KEY_ALIAS and ANDROID_KEY_PASSWORD" }
        require(file(keystorePath!!).isFile) { "Release keystore does not exist" }
    }
}
tasks.configureEach {
    if (name == "preReleaseBuild") dependsOn(verifyReleaseSigning)
}

dependencies {
    implementation("androidx.work:work-runtime-ktx:2.9.0")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    androidTestImplementation("androidx.test:runner:1.6.2")
    androidTestImplementation("androidx.test.ext:junit:1.2.1")
    testImplementation("junit:junit:4.13.2")
    testImplementation("com.squareup.okhttp3:mockwebserver:4.12.0")
}
kotlin { compilerOptions { jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17) } }
