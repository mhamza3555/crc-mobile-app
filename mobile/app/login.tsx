import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import Button from "../components/Button";
import Input from "../components/Input";
import { login } from "../lib/api";
import { saveToken } from "../lib/auth";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password) {
      Alert.alert(
        "Missing information",
        "Please enter your email and password."
      );
      return;
    }

    try {
      setLoading(true);

      const response = await login(
        trimmedEmail,
        password
      );

      await saveToken(response.access_token);

      if (response.user.role === "doctor") {
        router.replace("/doctor-dashboard");
        return;
      }

      router.replace("/dashboard");
    } catch (error) {
      Alert.alert(
        "Login failed",
        error instanceof Error
          ? error.message
          : "Unable to log in."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={
        Platform.OS === "ios" ? "padding" : undefined
      }
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Welcome back</Text>

        <Text style={styles.subtitle}>
          Log in to access your CRC application.
        </Text>

        <View style={styles.form}>
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
          />

          <View style={styles.passwordWrapper}>
            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              secureTextEntry={!showPassword}
            />

            <Pressable
              style={styles.eyeButton}
              onPress={() =>
                setShowPassword((current) => !current)
              }
            >
              <Text style={styles.eyeText}>
                {showPassword ? "Hide" : "Show"}
              </Text>
            </Pressable>
          </View>

          <Button
            title="Log In"
            onPress={handleLogin}
            loading={loading}
          />

          <Text
            style={styles.link}
            onPress={() => router.push("/register")}
          >
            Don't have an account? Create one
          </Text>

          <Text
            style={styles.back}
            onPress={() => router.back()}
          >
            ← Back
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F9FC",
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 28,
  },
  title: {
    fontSize: 34,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: "#64748B",
    lineHeight: 24,
    marginBottom: 32,
  },
  form: {
    width: "100%",
  },
  passwordWrapper: {
    position: "relative",
  },
  eyeButton: {
    position: "absolute",
    right: 14,
    top: 37,
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  eyeText: {
    color: "#1D4ED8",
    fontWeight: "700",
    fontSize: 13,
  },
  link: {
    textAlign: "center",
    color: "#1D4ED8",
    fontWeight: "600",
    marginTop: 22,
  },
  back: {
    textAlign: "center",
    color: "#64748B",
    marginTop: 22,
  },
});