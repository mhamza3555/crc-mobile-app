import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";

import Button from "../components/Button";
import { Assessment, getAssessments } from "../lib/api";

export default function PastAssessmentsScreen() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadAssessments() {
    try {
      const data = await getAssessments();
      setAssessments(data);
    } catch (error) {
      console.error(error);
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
          Past Assessments
        </Text>

        <Text style={styles.subtitle}>
          View your previous CRC risk assessments.
        </Text>

        {loading ? (
          <ActivityIndicator size="large" />
        ) : assessments.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>
              No assessments yet
            </Text>

            <Text style={styles.emptyText}>
              Complete your first assessment to see
              your results here.
            </Text>
          </View>
        ) : (
          assessments.map((assessment) => (
            <View
              key={assessment.id}
              style={styles.card}
            >
              <Text style={styles.date}>
                {new Date(
                  assessment.created_at
                ).toLocaleDateString()}
              </Text>

              <Text
                style={[
                  styles.risk,
                  assessment.risk === "HIGH"
                    ? styles.high
                    : styles.low,
                ]}
              >
                {assessment.risk} RISK
              </Text>

              <Text style={styles.probability}>
                Model probability:{" "}
                {(assessment.probability * 100).toFixed(1)}%
              </Text>
            </View>
          ))
        )}

        <Button
          title="Back to Dashboard"
          variant="secondary"
          onPress={() => router.back()}
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
  },

  title: {
    fontSize: 30,
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
    borderRadius: 16,
    padding: 20,
    marginBottom: 14,
  },

  date: {
    fontSize: 14,
    color: "#64748B",
    marginBottom: 8,
  },

  risk: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 8,
  },

  high: {
    color: "#DC2626",
  },

  low: {
    color: "#16A34A",
  },

  probability: {
    fontSize: 15,
    color: "#475569",
  },

  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },

  emptyText: {
    color: "#64748B",
    lineHeight: 22,
  },
});