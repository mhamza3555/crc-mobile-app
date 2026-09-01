import { router, useLocalSearchParams } from "expo-router";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import Button from "../components/Button";

export default function AssessmentResultScreen() {
  const {
    risk,
    probability,
    message,
    ai_explanation,
  } = useLocalSearchParams<{
    risk: string;
    probability: string;
    message: string;
    ai_explanation?: string;
  }>();

  const percentage = probability
    ? `${(Number(probability) * 100).toFixed(1)}%`
    : "N/A";

  const aiExplanation =
    ai_explanation ||
    "Your assessment has been completed. The AI explanation is not available yet.";

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.title}>
        Assessment Result
      </Text>

      {/* MODEL RESULT */}
      <View style={styles.card}>
        <Text style={styles.label}>
          Estimated Risk
        </Text>

        <Text
          style={[
            styles.risk,
            risk === "HIGH"
              ? styles.high
              : styles.low,
          ]}
        >
          {risk}
        </Text>

        <Text style={styles.probability}>
          Model probability: {percentage}
        </Text>

        <Text style={styles.message}>
          {message}
        </Text>
      </View>

      {/* AI EXPLANATION */}
      <View style={styles.aiCard}>
        <Text style={styles.aiTitle}>
          What does this mean?
        </Text>

        <Text style={styles.aiText}>
          {aiExplanation}
        </Text>
      </View>

      {/* NEXT STEPS */}
      <View style={styles.adviceCard}>
        <Text style={styles.adviceTitle}>
          What should you do?
        </Text>

        <Text style={styles.adviceText}>
          This result is a risk assessment, not a
          diagnosis. If your result indicates higher
          risk, it is important to discuss it with a
          qualified healthcare professional.
        </Text>

        <Text style={styles.adviceText}>
          A doctor can review your symptoms, medical
          history and test results and decide whether
          further evaluation or testing is needed.
        </Text>
      </View>

      {/* DISCLAIMER */}
      <View style={styles.disclaimerCard}>
        <Text style={styles.disclaimerTitle}>
          Important
        </Text>

        <Text style={styles.disclaimerText}>
          This assessment provides an estimated risk
          based on the information you entered. It does
          not diagnose colorectal cancer and should not
          replace professional medical advice.
        </Text>
      </View>

      <Button
        title="Back to Dashboard"
        onPress={() =>
          router.replace("/dashboard")
        }
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F9FC",
  },

  content: {
    padding: 28,
    paddingTop: 60,
    paddingBottom: 40,
  },

  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 24,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 24,
    marginBottom: 18,
  },

  label: {
    fontSize: 15,
    color: "#64748B",
    marginBottom: 8,
  },

  risk: {
    fontSize: 42,
    fontWeight: "900",
    marginBottom: 12,
  },

  high: {
    color: "#DC2626",
  },

  low: {
    color: "#16A34A",
  },

  probability: {
    fontSize: 16,
    color: "#334155",
    marginBottom: 18,
  },

  message: {
    fontSize: 14,
    lineHeight: 21,
    color: "#64748B",
  },

  aiCard: {
    backgroundColor: "#EEF4FF",
    borderRadius: 18,
    padding: 24,
    marginBottom: 18,
  },

  aiTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#1D4ED8",
    marginBottom: 12,
  },

  aiText: {
    fontSize: 15,
    lineHeight: 24,
    color: "#334155",
  },

  adviceCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 24,
    marginBottom: 18,
  },

  adviceTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 12,
  },

  adviceText: {
    fontSize: 15,
    lineHeight: 24,
    color: "#475569",
    marginBottom: 12,
  },

  disclaimerCard: {
    backgroundColor: "#FFF7ED",
    borderRadius: 18,
    padding: 20,
    marginBottom: 24,
  },

  disclaimerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#9A3412",
    marginBottom: 8,
  },

  disclaimerText: {
    fontSize: 13,
    lineHeight: 20,
    color: "#7C2D12",
  },
});