import { router, useFocusEffect } from "expo-router";
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import Button from "../components/Button";
import { getAssessments } from "../lib/api";
import { removeToken } from "../lib/auth";
import { useCallback, useState } from "react";

export default function DashboardScreen() {
  const [assessments, setAssessments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAssessments = async () => {
    try {
      setLoading(true);
      const data = await getAssessments();
      setAssessments(data);
    } catch (error) {
      console.log("Failed to load assessments:", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadAssessments();
    }, [])
  );

  async function handleLogout() {
    await removeToken();
    router.replace("/");
  }

  function openAssessment(assessment: any) {
    router.push({
      pathname: "/assessment-result",
      params: {
        risk: assessment.risk,
        probability: String(assessment.probability),
        message:
          assessment.risk === "HIGH"
            ? "The model estimated a higher colorectal cancer risk based on the information provided."
            : "The model estimated a lower colorectal cancer risk based on the information provided.",
        assessment_id: assessment.id,
      },
    });
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Patient Dashboard</Text>

        <Text style={styles.subtitle}>
          Manage your CRC risk assessments.
        </Text>

        {/* NEW ASSESSMENT */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            CRC Risk Assessment
          </Text>

          <Text style={styles.cardText}>
            Start a new assessment using your symptoms,
            medical history and available test results.
          </Text>

          <View style={styles.buttonSpacing} />

          <Button
            title="Start New Assessment"
            onPress={() => router.push("/assessment")}
          />
        </View>

        {/* PAST ASSESSMENTS */}
        <Text style={styles.sectionTitle}>
          Past Assessments
        </Text>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" />
            <Text style={styles.loadingText}>
              Loading assessments...
            </Text>
          </View>
        ) : assessments.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>
              No assessments yet
            </Text>

            <Text style={styles.emptyText}>
              Your completed CRC risk assessments will
              appear here.
            </Text>
          </View>
        ) : (
          assessments.map((assessment) => {
            const percentage = (
              Number(assessment.probability) * 100
            ).toFixed(1);

            const date = new Date(
              assessment.created_at
            ).toLocaleDateString();

            return (
              <TouchableOpacity
                key={assessment.id}
                style={styles.assessmentCard}
                onPress={() =>
                  openAssessment(assessment)
                }
              >
                <View style={styles.assessmentHeader}>
                  <Text style={styles.assessmentDate}>
                    {date}
                  </Text>

                  <Text
                    style={[
                      styles.risk,
                      assessment.risk === "HIGH"
                        ? styles.high
                        : styles.low,
                    ]}
                  >
                    {assessment.risk}
                  </Text>
                </View>

                <Text style={styles.probability}>
                  Model probability: {percentage}%
                </Text>

                <Text style={styles.viewText}>
                  Tap to view details →
                </Text>
              </TouchableOpacity>
            );
          })
        )}

        {/* LOGOUT */}
        <View style={styles.logoutSpacing} />

        <Button
          title="Log Out"
          variant="secondary"
          onPress={handleLogout}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F9FC",
  },

  content: {
    padding: 28,
    paddingBottom: 40,
  },

  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 16,
    color: "#64748B",
    marginBottom: 24,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 20,
    marginBottom: 28,
  },

  cardTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 8,
  },

  cardText: {
    fontSize: 15,
    lineHeight: 22,
    color: "#64748B",
  },

  buttonSpacing: {
    height: 18,
  },

  sectionTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 14,
  },

  assessmentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
  },

  assessmentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  assessmentDate: {
    fontSize: 15,
    fontWeight: "600",
    color: "#334155",
  },

  risk: {
    fontSize: 16,
    fontWeight: "900",
  },

  high: {
    color: "#DC2626",
  },

  low: {
    color: "#16A34A",
  },

  probability: {
    fontSize: 14,
    color: "#475569",
    marginBottom: 8,
  },

  viewText: {
    fontSize: 13,
    color: "#2563EB",
    fontWeight: "600",
  },

  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
  },

  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 6,
  },

  emptyText: {
    fontSize: 14,
    lineHeight: 21,
    color: "#64748B",
  },

  loading: {
    alignItems: "center",
    padding: 30,
  },

  loadingText: {
    marginTop: 10,
    color: "#64748B",
  },

  logoutSpacing: {
    height: 20,
  },
});