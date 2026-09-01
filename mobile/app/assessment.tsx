import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import Button from "../components/Button";
import {
  defaultPatientData,
  PatientData,
} from "../lib/patientData";
import { predict } from "../lib/api";

type OptionProps = {
  label: string;
  value: string;
  selected: string;
  onSelect: (value: string) => void;
};

function Option({
  label,
  value,
  selected,
  onSelect,
}: OptionProps) {
  return (
    <Pressable
      onPress={() => onSelect(value)}
      style={[
        styles.option,
        selected === value && styles.optionSelected,
      ]}
    >
      <Text
        style={[
          styles.optionText,
          selected === value &&
            styles.optionTextSelected,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function AssessmentScreen() {
  const [data, setData] =
    useState<PatientData>(defaultPatientData);

  const [loading, setLoading] = useState(false);

  function update(
    key: keyof PatientData,
    value: unknown
  ) {
    setData((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function clearDefaultZero(
    key: keyof PatientData
  ) {
    if (String(data[key]) === "0") {
      update(key, "");
    }
  }

  function normalizeNumericInput(
    value: string
  ): string {
    // Keep only digits and decimal points.
    let cleaned = value.replace(/[^0-9.]/g, "");

    // Allow only one decimal point.
    const firstDot = cleaned.indexOf(".");

    if (firstDot !== -1) {
      cleaned =
        cleaned.slice(0, firstDot + 1) +
        cleaned
          .slice(firstDot + 1)
          .replace(/\./g, "");
    }

    // Remove unnecessary leading zeros.
    // Example: 009.5 -> 9.5
    cleaned = cleaned.replace(
      /^0+(?=\d)/,
      ""
    );

    return cleaned;
  }

  function toNumber(value: unknown): number {
    const number = Number(value);

    return Number.isFinite(number)
      ? number
      : 0;
  }

  async function handleSubmit() {
    try {
      setLoading(true);

      /*
       * Numeric fields remain strings while the
       * patient is typing. They are converted to
       * numbers only when the assessment is submitted.
       */
      const normalizedData: PatientData = {
        ...data,

        Age: toNumber(data.Age),

        Obesity_BMI: toNumber(
          data.Obesity_BMI
        ),

        "ECOG status": Math.min(
          4,
          Math.max(
            0,
            toNumber(data["ECOG status"])
          )
        ),

        Hemoglobin: toNumber(
          data.Hemoglobin
        ),

        CEA_Level: toNumber(
          data.CEA_Level
        ),

        "serum Albumin": toNumber(
          data["serum Albumin"]
        ),
      };

      const result = await predict(
        normalizedData
      );

      router.push({
        pathname: "/assessment-result",

        params: {
          risk: result.risk,

          probability: String(
            result.probability
          ),

          message: result.message,

          ai_explanation:
            result.ai_explanation || "",

          assessment_id:
            result.assessment_id || "",
        },
      });
    } catch (error) {
      Alert.alert(
        "Assessment failed",
        error instanceof Error
          ? error.message
          : "Unable to complete the assessment."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>
        CRC Risk Assessment
      </Text>

      <Text style={styles.subtitle}>
        Please provide the patient's information
        below.
      </Text>

      {/* BASIC INFORMATION */}

      <Text style={styles.section}>
        Basic Information
      </Text>

      <Text style={styles.label}>
        Age
      </Text>

      <TextInput
        style={styles.input}
        keyboardType="number-pad"
        value={String(data.Age)}
        onFocus={() =>
          clearDefaultZero("Age")
        }
        onChangeText={(v) =>
          update(
            "Age",
            normalizeNumericInput(v)
          )
        }
        placeholder="Age in years"
        placeholderTextColor="#94A3B8"
      />

      <Text style={styles.label}>
        Gender
      </Text>

      <View style={styles.options}>
        <Option
          label="Male"
          value="Male"
          selected={String(data.Gender)}
          onSelect={(v) =>
            update("Gender", v)
          }
        />

        <Option
          label="Female"
          value="Female"
          selected={String(data.Gender)}
          onSelect={(v) =>
            update("Gender", v)
          }
        />
      </View>

      <Text style={styles.label}>
        BMI
      </Text>

      <TextInput
        style={styles.input}
        keyboardType="decimal-pad"
        value={String(data.Obesity_BMI)}
        onFocus={() =>
          clearDefaultZero(
            "Obesity_BMI"
          )
        }
        onChangeText={(v) =>
          update(
            "Obesity_BMI",
            normalizeNumericInput(v)
          )
        }
        placeholder="e.g. 24.5"
        placeholderTextColor="#94A3B8"
      />

      {/* MEDICAL HISTORY */}

      <Text style={styles.section}>
        Medical History
      </Text>

      <YesNo
        label="Smoking History"
        value={String(
          data.Smoking_History
        )}
        onChange={(v) =>
          update(
            "Smoking_History",
            v
          )
        }
      />

      <YesNo
        label="Alcohol Consumption"
        value={String(
          data.Alcohol_Consumption
        )}
        onChange={(v) =>
          update(
            "Alcohol_Consumption",
            v
          )
        }
      />

      <YesNo
        label="Diabetes"
        value={String(data.Diabetes)}
        onChange={(v) =>
          update("Diabetes", v)
        }
      />

      <YesNo
        label="Inflammatory Bowel Disease"
        value={String(
          data.Inflammatory_Bowel_Disease
        )}
        onChange={(v) =>
          update(
            "Inflammatory_Bowel_Disease",
            v
          )
        }
      />

      <YesNo
        label="Family History of CRC"
        value={String(
          data.Family_History
        )}
        onChange={(v) =>
          update(
            "Family_History",
            v
          )
        }
      />

      <Text style={styles.label}>
        Diet Risk
      </Text>

      <View style={styles.options}>
        {["Low", "Moderate", "High"].map(
          (value) => (
            <Option
              key={value}
              label={value}
              value={value}
              selected={String(
                data.Diet_Risk
              )}
              onSelect={(v) =>
                update(
                  "Diet_Risk",
                  v
                )
              }
            />
          )
        )}
      </View>

      <Text style={styles.label}>
        Physical Activity
      </Text>

      <View style={styles.options}>
        {[
          "Low",
          "Moderate",
          "High",
        ].map((value) => (
          <Option
            key={value}
            label={value}
            value={value}
            selected={String(
              data.Physical_Activity
            )}
            onSelect={(v) =>
              update(
                "Physical_Activity",
                v
              )
            }
          />
        ))}
      </View>

      {/* SYMPTOMS */}

      <Text style={styles.section}>
        Symptoms
      </Text>

      <YesNo
        label="Abdominal Pain"
        value={String(
          data["Abdominal Pain"]
        )}
        onChange={(v) =>
          update(
            "Abdominal Pain",
            v
          )
        }
      />

      <YesNo
        label="Bleeding PR"
        value={String(
          data["Bleeding PR"]
        )}
        onChange={(v) =>
          update(
            "Bleeding PR",
            v
          )
        }
      />

      <YesNo
        label="Weight Loss"
        value={String(
          data["Weight Loss"]
        )}
        onChange={(v) =>
          update(
            "Weight Loss",
            v
          )
        }
      />

      <YesNo
        label="Change in Bowel Habits"
        value={String(
          data["Bowel Change"]
        )}
        onChange={(v) =>
          update(
            "Bowel Change",
            v
          )
        }
      />

      <YesNo
        label="Tenesmus"
        value={String(data.Tenesmus)}
        onChange={(v) =>
          update("Tenesmus", v)
        }
      />

      <YesNo
        label="Anemia Related Symptoms"
        value={String(
          data[
            "Anemia related symptoms"
          ]
        )}
        onChange={(v) =>
          update(
            "Anemia related symptoms",
            v
          )
        }
      />

      <YesNo
        label="Palpable Abdominal Mass"
        value={String(
          data[
            "Abdominal Mass Palpable"
          ]
        )}
        onChange={(v) =>
          update(
            "Abdominal Mass Palpable",
            v
          )
        }
      />

      <YesNo
        label="Suspicious PR Examination"
        value={String(
          data["PR Exam Suspicious"]
        )}
        onChange={(v) =>
          update(
            "PR Exam Suspicious",
            v
          )
        }
      />

      <YesNo
        label="Pallor"
        value={String(data.Pallor)}
        onChange={(v) =>
          update("Pallor", v)
        }
      />

      {/* CLINICAL TESTS */}

      <Text style={styles.section}>
        Clinical Tests
      </Text>

      <Text style={styles.label}>
        ECOG Status (0–4)
      </Text>

      <TextInput
        style={styles.input}
        keyboardType="number-pad"
        value={String(
          data["ECOG status"]
        )}
        onFocus={() =>
          clearDefaultZero(
            "ECOG status"
          )
        }
        onChangeText={(v) =>
          update(
            "ECOG status",
            normalizeNumericInput(v).split(
              "."
            )[0]
          )
        }
        placeholder="0 to 4"
        placeholderTextColor="#94A3B8"
      />

      <Text style={styles.label}>
        Hemoglobin (g/dL)
      </Text>

      <TextInput
        style={styles.input}
        keyboardType="decimal-pad"
        value={String(
          data.Hemoglobin
        )}
        onFocus={() =>
          clearDefaultZero(
            "Hemoglobin"
          )
        }
        onChangeText={(v) =>
          update(
            "Hemoglobin",
            normalizeNumericInput(v)
          )
        }
        placeholder="e.g. 9.5"
        placeholderTextColor="#94A3B8"
      />

      <Text style={styles.label}>
        FIT / FOBT
      </Text>

      <View style={styles.options}>
        {[
          "Negative",
          "Positive",
        ].map((value) => (
          <Option
            key={value}
            label={value}
            value={value}
            selected={String(
              data["FIT/FOBT"]
            )}
            onSelect={(v) =>
              update(
                "FIT/FOBT",
                v
              )
            }
          />
        ))}
      </View>

      <Text style={styles.label}>
        CEA Level
      </Text>

      <TextInput
        style={styles.input}
        keyboardType="decimal-pad"
        value={String(
          data.CEA_Level
        )}
        onFocus={() =>
          clearDefaultZero(
            "CEA_Level"
          )
        }
        onChangeText={(v) =>
          update(
            "CEA_Level",
            normalizeNumericInput(v)
          )
        }
        placeholder="e.g. 12.5"
        placeholderTextColor="#94A3B8"
      />

      <Text style={styles.label}>
        Liver Function Test
      </Text>

      <View style={styles.options}>
        {[
          "Normal",
          "Abnormal",
        ].map((value) => (
          <Option
            key={value}
            label={value}
            value={value}
            selected={String(
              data[
                "Liver function Test"
              ]
            )}
            onSelect={(v) =>
              update(
                "Liver function Test",
                v
              )
            }
          />
        ))}
      </View>

      <Text style={styles.label}>
        Serum Albumin (g/dL)
      </Text>

      <TextInput
        style={styles.input}
        keyboardType="decimal-pad"
        value={String(
          data["serum Albumin"]
        )}
        onFocus={() =>
          clearDefaultZero(
            "serum Albumin"
          )
        }
        onChangeText={(v) =>
          update(
            "serum Albumin",
            normalizeNumericInput(v)
          )
        }
        placeholder="e.g. 3.5"
        placeholderTextColor="#94A3B8"
      />

      {/* WARNING */}

      <View style={styles.warning}>
        <Text style={styles.warningText}>
          This assessment provides a
          model-based risk estimate and
          is not a medical diagnosis.
        </Text>
      </View>

      <Button
        title="Submit Assessment"
        onPress={handleSubmit}
        loading={loading}
      />

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

function YesNo({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (
    value: string
  ) => void;
}) {
  return (
    <View style={styles.question}>
      <Text style={styles.label}>
        {label}
      </Text>

      <View style={styles.options}>
        <Option
          label="No"
          value="No"
          selected={value}
          onSelect={onChange}
        />

        <Option
          label="Yes"
          value="Yes"
          selected={value}
          onSelect={onChange}
        />
      </View>
    </View>
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
    color: "#64748B",
    marginBottom: 24,
    lineHeight: 22,
  },

  section: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 20,
    marginBottom: 16,
  },

  label: {
    fontSize: 15,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 8,
  },

  input: {
    height: 50,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    color: "#0F172A",
    marginBottom: 16,
  },

  options: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },

  option: {
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: "#E8F0FE",
  },

  optionSelected: {
    backgroundColor: "#1D4ED8",
  },

  optionText: {
    color: "#1D4ED8",
    fontWeight: "600",
  },

  optionTextSelected: {
    color: "#FFFFFF",
  },

  question: {
    marginBottom: 2,
  },

  warning: {
    backgroundColor: "#FFF7ED",
    borderRadius: 12,
    padding: 14,
    marginTop: 20,
    marginBottom: 20,
  },

  warningText: {
    color: "#9A3412",
    fontSize: 13,
    lineHeight: 19,
  },
});