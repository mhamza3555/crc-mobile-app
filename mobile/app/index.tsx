import { router } from "expo-router";
import {
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Button from "../components/Button";

export default function WelcomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.icon}>
          <Text style={styles.iconText}>+</Text>
        </View>

        <Text style={styles.title}>
          CRC Risk{"\n"}Assessment
        </Text>

        <Text style={styles.subtitle}>
          A simple tool to help identify colorectal
          cancer risk and guide patients toward
          appropriate medical care.
        </Text>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>
            Important
          </Text>

          <Text style={styles.infoText}>
            This application provides model-based
            risk information only. It is not a
            medical diagnosis.
          </Text>
        </View>

        <View style={styles.buttons}>
          <Button
            title="Log In"
            onPress={() => router.push("/login")}
          />

          <View style={styles.spacing} />

          <Button
            title="Create Account"
            variant="secondary"
            onPress={() => router.push("/register")}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F9FC",
  },
  content: {
    flex: 1,
    padding: 28,
    justifyContent: "center",
  },
  icon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: "#1D4ED8",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 28,
  },
  iconText: {
    color: "#FFFFFF",
    fontSize: 42,
    fontWeight: "300",
  },
  title: {
    fontSize: 38,
    lineHeight: 44,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 17,
    lineHeight: 26,
    color: "#64748B",
    marginBottom: 28,
  },
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    marginBottom: 28,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 6,
  },
  infoText: {
    color: "#64748B",
    lineHeight: 21,
  },
  buttons: {
    width: "100%",
  },
  spacing: {
    height: 12,
  },
});