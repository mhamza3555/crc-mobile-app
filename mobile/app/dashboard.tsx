import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
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
import {
  Assessment,
  getAssessments,
} from "../lib/api";
import { removeToken } from "../lib/auth";

export default function DashboardScreen() {
  const [assessments, setAssessments] =
    useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadAssessments() {
    try {
      setLoading(true);

      const data = await getAssessments();

      setAssessments(data);
    } catch (error) {
      console.log(
        "Failed to load assessments:",
        error
      );
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      loadAssessments();
    }, [])
  );

  async function handleLogout() {
    await removeToken();
    router.replace("/");
  }

  function openAssessment(
    assessment: Assessment
  ) {
    router.push({
      pathname: "/assessment-result",
      params: {
        risk: assessment.risk,
        probability: String(
          assessment.probability
        ),
        message:
          assessment.risk === "HIGH"
            ? "The model estimated a higher colorectal cancer risk based on the information provided."
            : "The model estimated a lower colorectal cancer risk based on the information provided.",
        ai_explanation:
          assessment.ai_explanation || "",
        assessment_id:
          assessment.id,
      },
    });
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
      >
        <Text style={styles.title}>
          Patient Dashboard
        </Text>

        <Text style={styles.subtitle}>
          Manage your CRC risk assessments and
          appointments.
        </Text>

        {/* NEW ASSESSMENT */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            CRC Risk Assessment
          </Text>

          <Text style={styles.cardText}>
            Complete a new assessment using your
            symptoms, medical history and available
            test results.
          </Text>

          <View style={styles.spacing} />

          <Button
            title="Start New Assessment"
            onPress={() =>
              router.push("/assessment")
            }
          />
        </View>

        {/* QUICK ACTIONS */}
        <Text style={styles.sectionTitle}>
          Quick Actions
        </Text>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() =>
              router.push(
                "/past-assessments"
              )
            }
          >
            <Text style={styles.actionTitle}>
              Past Assessments
            </Text>

            <Text style={styles.actionText}>
              View previous results and AI
              explanations.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() =>
              router.push(
                "/find-doctor"
              )
            }
          >
            <Text style={styles.actionTitle}>
              Find a Doctor
            </Text>

            <Text style={styles.actionText}>
              Choose a doctor and request an
              appointment.
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.appointmentCard}
          onPress={() =>
            router.push("/appointments")
          }
        >
          <Text style={styles.actionTitle}>
            My Appointments
          </Text>

          <Text style={styles.actionText}>
            View pending and confirmed
            appointments.
          </Text>
        </TouchableOpacity>

        {/* RECENT ASSESSMENTS */}
        <Text style={styles.sectionTitle}>
          Recent Assessments
        </Text>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" />

            <Text style={styles.loadingText}>
              Loading...
            </Text>
          </View>
        ) : assessments.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>
              No assessments yet
            </Text>

            <Text style={styles.emptyText}>
              Complete your first assessment to
              see your results here.
            </Text>
          </View>
        ) : (
          assessments
            .slice(0, 3)
            .map((assessment) => (
              <TouchableOpacity
                key={assessment.id}
                style={styles.assessmentCard}
                onPress={() =>
                  openAssessment(
                    assessment
                  )
                }
              >
                <View style={styles.row}>
                  <Text
                    style={[
                      styles.risk,
                      assessment.risk ===
                      "HIGH"
                        ? styles.high
                        : styles.low,
                    ]}
                  >
                    {assessment.risk}
                  </Text>

                  <Text
                    style={styles.probability}
                  >
                    {(
                      assessment.probability *
                      100
                    ).toFixed(1)}
                    %
                  </Text>
                </View>

                <Text style={styles.date}>
                  {new Date(
                    assessment.created_at
                  ).toLocaleString()}
                </Text>

                <Text style={styles.viewText}>
                  Tap to view details →
                </Text>
              </TouchableOpacity>
            ))
        )}

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
    padding: 24,
    paddingBottom: 40,
  },

  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: "#64748B",
    marginBottom: 22,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 20,
    marginBottom: 24,
  },

  cardTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 8,
  },

  cardText: {
    fontSize: 14,
    lineHeight: 21,
    color: "#64748B",
  },

  sectionTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 14,
  },

  actionRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },

  actionCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 17,
  },

  appointmentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    marginBottom: 26,
  },

  actionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 6,
  },

  actionText: {
    fontSize: 13,
    lineHeight: 19,
    color: "#64748B",
  },

  assessmentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    marginBottom: 10,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  risk: {
    fontSize: 17,
    fontWeight: "900",
  },

  high: {
    color: "#DC2626",
  },

  low: {
    color: "#16A34A",
  },

  probability: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2563EB",
  },

  date: {
    marginTop: 7,
    fontSize: 13,
    color: "#64748B",
  },

  viewText: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: "600",
    color: "#2563EB",
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
    padding: 25,
  },

  loadingText: {
    marginTop: 8,
    color: "#64748B",
  },

  spacing: {
    height: 18,
  },

  logoutSpacing: {
    height: 22,
  },
});