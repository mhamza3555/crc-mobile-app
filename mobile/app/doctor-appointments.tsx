import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import Button from "../components/Button";
import {
  Appointment,
  getDoctorAppointments,
  updateAppointmentStatus,
} from "../lib/api";

export default function DoctorAppointmentsScreen() {
  const [appointments, setAppointments] =
    useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      setLoading(true);
      setAppointments(
        await getDoctorAppointments()
      );
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error
          ? error.message
          : "Unable to load appointments."
      );
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  async function update(
    id: string,
    status: "ACCEPTED" | "REJECTED"
  ) {
    try {
      await updateAppointmentStatus(
        id,
        status
      );

      await load();
    } catch (error) {
      Alert.alert(
        "Update failed",
        error instanceof Error
          ? error.message
          : "Unable to update appointment."
      );
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>
          Appointment Requests
        </Text>

        <Text style={styles.subtitle}>
          Review and manage patient requests.
        </Text>

        {loading ? (
          <Text style={styles.message}>
            Loading...
          </Text>
        ) : appointments.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              No appointments
            </Text>

            <Text style={styles.text}>
              No appointment requests are currently
              available.
            </Text>
          </View>
        ) : (
          appointments.map((appointment) => (
            <View
              key={appointment.id}
              style={styles.card}
            >
              <Text style={styles.patientName}>
                {appointment.patient?.name}
              </Text>

              <Text style={styles.email}>
                {appointment.patient?.email}
              </Text>

              <Text style={styles.status}>
                {appointment.status}
              </Text>

              {appointment.latest_assessment && (
                <Text style={styles.assessment}>
                  Latest assessment:{" "}
                  {appointment.latest_assessment.risk}{" "}
                  (
                  {(
                    appointment
                      .latest_assessment
                      .probability * 100
                  ).toFixed(1)}
                  %)
                </Text>
              )}

              <Text style={styles.date}>
                Requested:{" "}
                {new Date(
                  appointment.requested_at
                ).toLocaleString()}
              </Text>

              {appointment.status ===
                "PENDING" && (
                <View style={styles.buttonRow}>
                  <View style={styles.buttonHalf}>
                    <Button
                      title="Accept"
                      onPress={() =>
                        update(
                          appointment.id,
                          "ACCEPTED"
                        )
                      }
                    />
                  </View>

                  <View style={styles.buttonHalf}>
                    <Button
                      title="Reject"
                      variant="secondary"
                      onPress={() =>
                        update(
                          appointment.id,
                          "REJECTED"
                        )
                      }
                    />
                  </View>
                </View>
              )}

              {(appointment.status ===
                "ACCEPTED" ||
                appointment.status ===
                  "COMPLETED") && (
                <Button
                  title="Open Patient"
                  variant="secondary"
                  onPress={() =>
                    router.push({
                      pathname:
                        "/doctor-patient",
                      params: {
                        patient_id:
                          appointment.patient
                            ?.id,
                      },
                    })
                  }
                />
              )}
            </View>
          ))
        )}

        <Button
          title="Back to Dashboard"
          variant="secondary"
          onPress={() =>
            router.replace(
              "/doctor-dashboard"
            )
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
    marginBottom: 22,
  },

  message: {
    color: "#64748B",
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 17,
    padding: 20,
    marginBottom: 12,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 6,
  },

  patientName: {
    fontSize: 19,
    fontWeight: "800",
    color: "#0F172A",
  },

  email: {
    marginTop: 4,
    color: "#64748B",
  },

  status: {
    marginTop: 14,
    fontWeight: "900",
    color: "#D97706",
  },

  assessment: {
    marginTop: 9,
    color: "#334155",
    fontWeight: "600",
  },

  date: {
    marginTop: 7,
    marginBottom: 15,
    color: "#64748B",
    fontSize: 13,
  },

  text: {
    color: "#64748B",
  },

  buttonRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },

  buttonHalf: {
    flex: 1,
  },
});