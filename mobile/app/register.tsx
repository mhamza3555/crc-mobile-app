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
import { register } from "../lib/api";

type Role = "patient" | "doctor";

export default function RegisterScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<Role>("patient");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (
      !trimmedName ||
      !trimmedEmail ||
      !password ||
      !confirmPassword
    ) {
      Alert.alert(
        "Missing information",
        "Please complete all fields."
      );
      return;
    }

    if (!trimmedEmail.includes("@")) {
      Alert.alert(
        "Invalid email",
        "Please enter a valid email address."
      );
      return;
    }

    if (password.length < 8) {
      Alert.alert(
        "Password too short",
        "Your password must contain at least 8 characters."
      );
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert(
        "Passwords do not match",
        "Please make sure both password fields are identical."
      );
      return;
    }

    try {
      setLoading(true);

      await register(
        trimmedName,
        trimmedEmail,
        password,
        role
      );

      Alert.alert(
        "Account created",
        role === "doctor"
          ? "Your doctor account has been created. You can now log in."
          : "Your patient account has been created. You can now log in.",
        [
          {
            text: "Continue",
            onPress: () => router.replace("/login"),
          },
        ]
      );
    } catch (error) {
      Alert.alert(
        "Registration failed",
        error instanceof Error
          ? error.message
          : "Unable to create your account."
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
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Create account</Text>

        <Text style={styles.subtitle}>
          Choose your account type and enter your details.
        </Text>

        <Text style={styles.sectionTitle}>
          Account type
        </Text>

        <View style={styles.roleRow}>
          <Pressable
            onPress={() => setRole("patient")}
            style={[
              styles.roleCard,
              role === "patient" && styles.roleCardSelected,
            ]}
          >
            <Text
              style={[
                styles.roleTitle,
                role === "patient" && styles.roleTitleSelected,
              ]}
            >
              Patient
            </Text>

            <Text
              style={[
                styles.roleDescription,
                role === "patient" &&
                  styles.roleDescriptionSelected,
              ]}
            >
              Complete CRC risk assessments
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setRole("doctor")}
            style={[
              styles.roleCard,
              role === "doctor" && styles.roleCardSelected,
            ]}
          >
            <Text
              style={[
                styles.roleTitle,
                role === "doctor" && styles.roleTitleSelected,
              ]}
            >
              Doctor
            </Text>

            <Text
              style={[
                styles.roleDescription,
                role === "doctor" &&
                  styles.roleDescriptionSelected,
              ]}
            >
              Review patient assessments
            </Text>
          </Pressable>
        </View>

        <Input
          label="Full name"
          value={name}
          onChangeText={setName}
          placeholder="Your name"
        />

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
            placeholder="At least 8 characters"
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

        <View style={styles.passwordWrapper}>
          <Input
            label="Confirm password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Re-enter your password"
            secureTextEntry={!showConfirmPassword}
          />

          <Pressable
            style={styles.eyeButton}
            onPress={() =>
              setShowConfirmPassword((current) => !current)
            }
          >
            <Text style={styles.eyeText}>
              {showConfirmPassword ? "Hide" : "Show"}
            </Text>
          </Pressable>
        </View>

        <Button
          title={
            role === "doctor"
              ? "Create Doctor Account"
              : "Create Patient Account"
          }
          onPress={handleRegister}
          loading={loading}
        />

        <Text
          style={styles.link}
          onPress={() => router.push("/login")}
        >
          Already have an account? Log in
        </Text>

        <Text
          style={styles.back}
          onPress={() => router.back()}
        >
          ← Back
        </Text>
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
    padding: 28,
    paddingBottom: 40,
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
    marginBottom: 26,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 10,
  },
  roleRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },
  roleCard: {
    flex: 1,
    minHeight: 100,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
  },
  roleCardSelected: {
    borderColor: "#1D4ED8",
    backgroundColor: "#E8F0FE",
  },
  roleTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 6,
  },
  roleTitleSelected: {
    color: "#1D4ED8",
  },
  roleDescription: {
    fontSize: 13,
    lineHeight: 18,
    color: "#64748B",
  },
  roleDescriptionSelected: {
    color: "#1E40AF",
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