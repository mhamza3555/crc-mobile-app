import { router } from "expo-router";
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import Button from "../components/Button";
import { removeToken } from "../lib/auth";

export default function DoctorDashboardScreen() {
  async function handleLogout() {
    await removeToken();
    router.replace("/");
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.eyebrow}>
          DOCTOR PORTAL
        </Text>

        <Text style={styles.title}>
          Doctor Dashboard
        </Text>

        <Text style={styles.subtitle}>
          Review patient CRC risk assessments and
          model-generated results.
        </Text>

        <View style={styles.statRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>—</Text>
            <Text style={styles.statLabel}>
              Assessments
            </Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statNumber}>—</Text>
            <Text style={styles.statLabel}>
              High Risk
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Patient Assessments
          </Text>

          <Text style={styles.cardText}>
            Patient assessment records and risk results
            will appear here.
          </Text>
        </View>

        <Button
          title="View Assessments"
          onPress={() =>
            router.push("/doctor-assessments")
          }
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
  eyebrow: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1D4ED8",
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    color: "#64748B",
    marginBottom: 28,
  },
  statRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 18,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0F172A",
  },
  statLabel: {
    marginTop: 4,
    color: "#64748B",
    fontSize: 13,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
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