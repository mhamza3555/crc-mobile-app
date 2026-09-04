import { router } from "expo-router";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useEffect, useState } from "react";

import Button from "../components/Button";
import {
  Assessment,
  getAssessments,
} from "../lib/api";

export default function PastAssessmentsScreen() {
  const [assessments, setAssessments] =
    useState<Assessment[]>([]);
  const [selected, setSelected] =
    useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
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

  useEffect(() => {
    load();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
      >
        <Text style={styles.title}>
          Past Assessments
        </Text>

        <Text style={styles.subtitle}>
          Review your previous CRC risk assessments.
        </Text>

        {loading ? (
          <Text style={styles.message}>
            Loading assessments...
          </Text>
        ) : assessments.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              No assessments yet
            </Text>

            <Text style={styles.text}>
              Complete an assessment and it will
              appear here.
            </Text>
          </View>
        ) : (
          assessments.map((assessment) => (
            <TouchableOpacity
              key={assessment.id}
              style={styles.assessmentCard}
              onPress={() =>
                setSelected(assessment)
              }
            >
              <View style={styles.row}>
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

                <Text style={styles.probability}>
                  {(
                    assessment.probability * 100
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

        {selected && (
          <View style={styles.detailCard}>
            <Text style={styles.detailTitle}>
              Assessment Details
            </Text>

            <Text style={styles.detailDate}>
              {new Date(
                selected.created_at
              ).toLocaleString()}
            </Text>

            <Text
              style={[
                styles.detailRisk,
                selected.risk === "HIGH"
                  ? styles.high
                  : styles.low,
              ]}
            >
              {selected.risk} RISK
            </Text>

            <Text style={styles.text}>
              Model probability:{" "}
              {(
                selected.probability * 100
              ).toFixed(1)}
              %
            </Text>

            <Text style={styles.section}>
              Patient Information
            </Text>

            {selected.patient_data &&
              Object.entries(
                selected.patient_data
              ).map(([key, value]) => (
                <View
                  key={key}
                  style={styles.inputRow}
                >
                  <Text style={styles.inputKey}>
                    {key}
                  </Text>

                  <Text style={styles.inputValue}>
                    {String(value)}
                  </Text>
                </View>
              ))}

            <Text style={styles.section}>
              AI Explanation
            </Text>

            <View style={styles.aiCard}>
              <Text style={styles.aiText}>
                {selected.ai_explanation ||
                  "No AI explanation was saved for this assessment."}
              </Text>
            </View>

            <Button
              title="Close Details"
              variant="secondary"
              onPress={() =>
                setSelected(null)
              }
            />
          </View>
        )}

        <View style={styles.spacing} />

        <Button
          title="Back to Dashboard"
          variant="secondary"
          onPress={() =>
            router.replace("/dashboard")
          }
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
    color: "#64748B",
    fontSize: 15,
    marginBottom: 22,
  },

  message: {
    color: "#64748B",
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 8,
  },

  text: {
    color: "#475569",
    lineHeight: 21,
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
    fontSize: 18,
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
    color: "#64748B",
    fontSize: 13,
  },

  viewText: {
    marginTop: 8,
    color: "#2563EB",
    fontSize: 13,
    fontWeight: "600",
  },

  detailCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 20,
    marginTop: 20,
  },

  detailTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 5,
  },

  detailDate: {
    color: "#64748B",
    marginBottom: 18,
  },

  detailRisk: {
    fontSize: 27,
    fontWeight: "900",
    marginBottom: 8,
  },

  section: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 22,
    marginBottom: 12,
  },

  inputRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 14,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },

  inputKey: {
    flex: 1,
    fontSize: 12,
    color: "#64748B",
  },

  inputValue: {
    flex: 1,
    textAlign: "right",
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
  },

  aiCard: {
    backgroundColor: "#EEF4FF",
    borderRadius: 15,
    padding: 16,
  },

  aiText: {
    color: "#334155",
    lineHeight: 22,
    fontSize: 13,
  },

  spacing: {
    height: 20,
  },
});