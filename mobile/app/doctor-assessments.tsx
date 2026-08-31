import { router } from "expo-router";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import Button from "../components/Button";
import { getAssessments } from "../lib/api";
import { useEffect, useState } from "react";

type Assessment = Awaited<
  ReturnType<typeof getAssessments>
>[number];

export default function DoctorAssessmentsScreen() {
  const [assessments, setAssessments] = useState<Assessment[]>(
    []
  );
  const [loading, setLoading] = useState(true);

  async function loadAssessments() {
    try {
      const data = await getAssessments();
      setAssessments(data);
    } catch {
      setAssessments([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAssessments();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>
          Assessments
        </Text>

        <Text style={styles.subtitle}>
          Assessment records available to the
          authenticated account.
        </Text>

        {loading && (
          <Text style={styles.message}>
            Loading assessments...
          </Text>
        )}

        {!loading && assessments.length === 0 && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>
              No assessments yet
            </Text>

            <Text style={styles.emptyText}>
              There are currently no assessment records
              available.
            </Text>
          </View>
        )}

        {!loading &&
          assessments.map((assessment) => (
            <View
              key={assessment.id}
              style={styles.assessmentCard}
            >
              <View style={styles.row}>
                <Text style={styles.risk}>
                  {assessment.risk}
                </Text>

                <Text style={styles.probability}>
                  {(assessment.probability * 100).toFixed(
                    1
                  )}
                  %
                </Text>
              </View>

              <Text style={styles.date}>
                {new Date(
                  assessment.created_at
                ).toLocaleString()}
              </Text>
            </View>
          ))}

        <Button
          title="Back to Dashboard"
          variant="secondary"
          onPress={() =>
            router.replace("/doctor-dashboard")
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
    padding: 28,
    paddingBottom: 40,
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
    marginBottom: 24,
  },
  message: {
    color: "#64748B",
    marginBottom: 20,
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 8,
  },
  emptyText: {
    color: "#64748B",
    lineHeight: 22,
  },
  assessmentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  risk: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  probability: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1D4ED8",
  },
  date: {
    color: "#64748B",
    marginTop: 7,
    fontSize: 13,
  },
});