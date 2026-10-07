plugins { id("com.android.application"); id("org.jetbrains.kotlin.android") }
android {
    namespace = "com.smscenter.app"
    compileSdk = 35
    defaultConfig { applicationId = "com.smscenter.app"; minSdk = 26; targetSdk = 35; versionCode = 1; versionName = "1.0.0" }
    buildTypes { release { isMinifyEnabled = false } }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
}
dependencies { implementation("androidx.work:work-runtime-ktx:2.9.0") }

kotlin { compilerOptions { jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17) } }
