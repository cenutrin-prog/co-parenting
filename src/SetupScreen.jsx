// src/SetupScreen.jsx
import React from "react";

export default function SetupScreen({
  parents,
  setParents,
  children,
  setChildren,
  caregiver,
  setCaregiver,
  goToCalendar,
}) {
  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Configuración inicial</h1>

      {/* Padres */}
      <div style={styles.block}>
        <h2 style={styles.subtitle}>Padres</h2>

        <input
          style={styles.input}
          placeholder="Nombre del padre / madre 1"
          defaultValue={parents.parent1}
          onChange={(e) =>
            setParents({ ...parents, parent1: e.target.value })
          }
        />

        <input
          style={styles.input}
          placeholder="Nombre del padre / madre 2"
          defaultValue={parents.parent2}
          onChange={(e) =>
            setParents({ ...parents, parent2: e.target.value })
          }
        />
      </div>

      {/* Hijos */}
      <div style={styles.block}>
        <h2 style={styles.subtitle}>Hijos</h2>

        <input
          style={styles.input}
          placeholder="Hijo/a 1"
          defaultValue={children.child1}
          onChange={(e) =>
            setChildren({ ...children, child1: e.target.value })
          }
        />

        <input
          style={styles.input}
          placeholder="Hijo/a 2"
          defaultValue={children.child2}
          onChange={(e) =>
            setChildren({ ...children, child2: e.target.value })
          }
        />

        <input
          style={styles.input}
          placeholder="Hijo/a 3"
          defaultValue={children.child3}
          onChange={(e) =>
            setChildren({ ...children, child3: e.target.value })
          }
        />
      </div>

      {/* Otro cuidador */}
      <div style={styles.block}>
        <h2 style={styles.subtitle}>Otro cuidador (opcional)</h2>

        <input
          style={styles.input}
          placeholder="Nombre del cuidador"
          defaultValue={caregiver}
          onChange={(e) => setCaregiver(e.target.value)}
        />
      </div>

      <button style={styles.button} onClick={goToCalendar}>
        Continuar
      </button>
    </div>
  );
}

const styles = {
  container: {
    padding: "20px",
    maxWidth: "500px",
    margin: "0 auto",
    fontFamily: "sans-serif",
  },
  title: {
    textAlign: "center",
  },
  subtitle: {
    marginBottom: "10px",
  },
  block: {
    marginBottom: "20px",
  },
  input: {
    width: "100%",
    padding: "10px",
    marginBottom: "10px",
    fontSize: "16px",
    borderRadius: "6px",
    border: "1px solid #ccc",
  },
  button: {
    width: "100%",
    padding: "12px",
    fontSize: "18px",
    borderRadius: "6px",
    border: "none",
    backgroundColor: "#007bff",
    color: "white",
    cursor: "pointer",
  },
};
