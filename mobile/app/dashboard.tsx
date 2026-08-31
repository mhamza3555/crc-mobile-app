import { router } from "expo-router";
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import Button from "../components/Button";
import { getAssessments } from "../lib/api";
import { removeToken } from "../lib/auth";

export default function DashboardScreen() {
  async function handleLogout() {
    await removeToken();
    router.replace("/");
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Patient Dashboard</Text>

        <Text style={styles.subtitle}>
          Welcome! You are successfully logged in.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            CRC Risk Assessment
          </Text>

          <Text style={styles.cardText}>
            Start an assessment to evaluate colorectal
            cancer risk based on the available patient
            information.
          </Text>
        </View>

        <Button
          title="Start Assessment"
          onPress={() => router.push("/assessment")}
        />

        <View style={styles.spacing} />

        <Button
          title="Log Out"
          variant="secondary"
          onPress={handleLogout}
        />
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
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: "#64748B",
    marginBottom: 28,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 28,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 8,
  },
  cardText: {
    fontSize: 15,
    lineHeight: 22,
    color: "#64748B",
  },
  spacing: {
    height: 12,
  },
});