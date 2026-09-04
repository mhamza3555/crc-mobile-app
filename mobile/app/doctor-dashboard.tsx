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
  getDoctorAppointments,
  getDoctorPatients,
  Appointment,
  DoctorPatient,
} from "../lib/api";
import { removeToken } from "../lib/auth";

export default function DoctorDashboardScreen() {
  const [appointments, setAppointments] =
    useState<Appointment[]>([]);
  const [patients, setPatients] =
    useState<DoctorPatient[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      setLoading(true);

      const [
        appointmentData,
        patientData,
      ] = await Promise.all([
        getDoctorAppointments(),
        getDoctorPatients(),
      ]);

      setAppointments(appointmentData);
      setPatients(patientData);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  async function handleLogout() {
    await removeToken();
    router.replace("/");
  }

  const pendingCount =
    appointments.filter(
      (item) => item.status === "PENDING"
    ).length;

  const highRiskCount =
    patients.filter(
      (item) =>
        item.latest_assessment?.risk === "HIGH"
    ).length;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>
          DOCTOR PORTAL
        </Text>

        <Text style={styles.title}>
          Doctor Dashboard
        </Text>

        <Text style={styles.subtitle}>
          Manage appointment requests and review
          assigned patient assessments.
        </Text>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" />
          </View>
        ) : (
          <>
            <View style={styles.statRow}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>
                  {pendingCount}
                </Text>

                <Text style={styles.statLabel}>
                  Pending Requests
                </Text>
              </View>

              <View style={styles.statCard}>
                <Text style={styles.statNumber}>
                  {patients.length}
                </Text>

                <Text style={styles.statLabel}>
                  Patients
                </Text>
              </View>

              <View style={styles.statCard}>
                <Text style={styles.statNumber}>
                  {highRiskCount}
                </Text>

                <Text style={styles.statLabel}>
                  High Risk
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.card}
              onPress={() =>
                router.push(
                  "/doctor-appointments"
                )
              }
            >
              <Text style={styles.cardTitle}>
                Appointment Requests
              </Text>

              <Text style={styles.cardText}>
                {pendingCount === 0
                  ? "No pending requests."
                  : `You have ${pendingCount} pending appointment request${
                      pendingCount === 1
                        ? ""
                        : "s"
                    }.`}
              </Text>

              <Text style={styles.link}>
                View requests →
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.card}
              onPress={() =>
                router.push(
                  "/doctor-patients"
                )
              }
            >
              <Text style={styles.cardTitle}>
                My Patients
              </Text>

              <Text style={styles.cardText}>
                Review assigned patients, their
                assessment history and model results.
              </Text>

              <Text style={styles.link}>
                View patients →
              </Text>
            </TouchableOpacity>
          </>
        )}

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

  eyebrow: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1D4ED8",
    letterSpacing: 1.2,
    marginBottom: 8,
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

  statRow: {
    flexDirection: "row",
    gap: 9,
    marginBottom: 18,
  },

  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    padding: 14,
  },

  statNumber: {
    fontSize: 25,
    fontWeight: "900",
    color: "#0F172A",
  },

  statLabel: {
    marginTop: 3,
    fontSize: 11,
    color: "#64748B",
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 17,
    padding: 19,
    marginBottom: 12,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 7,
  },

  cardText: {
    fontSize: 14,
    lineHeight: 21,
    color: "#64748B",
  },

  link: {
    marginTop: 14,
    color: "#2563EB",
    fontWeight: "700",
  },

  loading: {
    padding: 40,
    alignItems: "center",
  },
});