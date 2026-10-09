import { useState, useEffect } from "react";
import "./App.css";

const API_URL = "https://campuslive-api.onrender.com";

const CAMPUS_RADIUS = 250;

const CAMPUS_LOCATION = {
  name: "Vishnu Women's College",
  latitude: 16.56860357990701,
  longitude: 81.52227602227867,
};

function App() {
  // =========================
  // LOGIN STATE
  // =========================
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [splashExiting, setSplashExiting] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginMessage, setLoginMessage] = useState("");

  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
  });

  const [currentUser, setCurrentUser] = useState(null);
// =========================
// SPLASH SCREEN
// =========================
useEffect(() => {
  const exitTimer = setTimeout(() => {
    setSplashExiting(true);
  }, 3500);

  const removeTimer = setTimeout(() => {
    setShowSplash(false);
  }, 4300);

  return () => {
    clearTimeout(exitTimer);
    clearTimeout(removeTimer);
  };
}, []);
  // =========================
  // CAMPUS ISSUE STATE
  // =========================
  const [issues, setIssues] = useState([]);
  const [activePage, setActivePage] = useState("Dashboard");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [userLocation, setUserLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState("not_checked");
  const [locationMessage, setLocationMessage] = useState("");

  const [form, setForm] = useState({
    location: "",
    category: "",
    description: "",
  });

  // =========================
  // LOGIN FORM HANDLER
  // =========================
  const handleLoginChange = (e) => {
    setLoginForm({
      ...loginForm,
      [e.target.name]: e.target.value,
    });
  };

  // =========================
  // LOGIN
  // =========================
  const handleLogin = async (e) => {
    e.preventDefault();

    if (!loginForm.email.trim() || !loginForm.password.trim()) {
      setLoginMessage("Please enter your email and password.");
      return;
    }

    setLoginLoading(true);
    setLoginMessage("");

    try {
      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: loginForm.email,
          password: loginForm.password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || "Invalid email or password");
      }

      setCurrentUser(result.user);
      setIsLoggedIn(true);
      setLoginMessage("");

      setLoginForm({
        email: "",
        password: "",
      });
    } catch (error) {
      console.error("Login error:", error);
      setLoginMessage(
        error.message || "Login failed. Please try again."
      );
    } finally {
      setLoginLoading(false);
    }
  };

  // =========================
  // LOAD ISSUES
  // =========================
  const loadIssues = async () => {
    try {
      const response = await fetch(`${API_URL}/issues`);

      if (!response.ok) {
        throw new Error("Failed to load issues");
      }

      const data = await response.json();

      setIssues(Array.isArray(data) ? data : data.issues || []);
    } catch (error) {
      console.error("Error loading issues:", error);
      setMessage("Failed to load issues. Check your backend.");
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // LOAD ISSUES AFTER LOGIN
  // =========================
  useEffect(() => {
    if (!isLoggedIn) {
      return;
    }

    loadIssues();

    const interval = setInterval(() => {
      loadIssues();
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, [isLoggedIn]);

  // =========================
  // CHECK CAMPUS LOCATION
  // =========================
  const checkLocation = () => {
    const calculateDistance = (
      lat1,
      lon1,
      lat2,
      lon2
    ) => {
      const R = 6371000;

      const toRadians = (degrees) =>
        (degrees * Math.PI) / 180;

      const dLat = toRadians(lat2 - lat1);
      const dLon = toRadians(lon2 - lon1);

      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRadians(lat1)) *
          Math.cos(toRadians(lat2)) *
          Math.sin(dLon / 2) ** 2;

      const c =
        2 *
        Math.atan2(
          Math.sqrt(a),
          Math.sqrt(1 - a)
        );

      return R * c;
    };

    if (!navigator.geolocation) {
      setLocationStatus("error");

      setLocationMessage(
        "Location is not supported by this browser."
      );

      return;
    }

    setLocationStatus("checking");

    setLocationMessage(
      "Detecting your location..."
    );

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        setUserLocation({
          latitude,
          longitude,
        });

        const distance = calculateDistance(
          latitude,
          longitude,
          CAMPUS_LOCATION.latitude,
          CAMPUS_LOCATION.longitude
        );

        if (distance <= CAMPUS_RADIUS) {
          setLocationStatus("inside");

          setLocationMessage(
            `You are inside the ${CAMPUS_LOCATION.name} campus area.`
          );
        } else {
          setLocationStatus("outside");

          setLocationMessage(
            `You are outside the ${CAMPUS_LOCATION.name} campus area. Distance: ${Math.round(
              distance
            )} meters.`
          );
        }
      },

      (error) => {
        console.error("Location error:", error);

        setLocationStatus("error");

        setLocationMessage(
          "Unable to access location. Please allow location permission."
        );
      },

      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  // =========================
  // FORM INPUT HANDLER
  // =========================
  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  // =========================
  // SUBMIT ISSUE
  // =========================
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (locationStatus !== "inside") {
      alert(
        "You must be inside the SVECW campus area to report an issue. Please check your location."
      );
      return;
    }

    if (
      !form.location.trim() ||
      !form.category ||
      !form.description.trim()
    ) {
      setMessage("Please fill in all fields.");
      return;
    }

    setSubmitting(true);
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/issues`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          location: form.location,
          category: form.category,
          description: form.description,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.detail || "Could not submit issue"
        );
      }

      setForm({
        location: "",
        category: "",
        description: "",
      });

      setMessage("Issue reported successfully!");

      await loadIssues();
    } catch (error) {
      console.error(
        "Error submitting issue:",
        error
      );

      setMessage(
        "Failed to submit issue. Check your backend."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // =========================
  // CANCEL ISSUE
  // =========================
  const cancelIssue = async (issueId) => {
    const confirmed = window.confirm(
      "Are you sure you want to cancel this issue request?"
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/issues/${issueId}/cancel`,
        {
          method: "PATCH",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.detail || "Could not cancel issue"
        );
      }

      setMessage("Issue request cancelled successfully.");

      await loadIssues();
    } catch (error) {
      console.error(
        "Error cancelling issue:",
        error
      );

      setMessage(
        "Failed to cancel issue. Please try again."
      );
    }
  };

  // =========================
  // REPORT FORM
  // =========================
  const renderReportForm = () => (
    <div className="panel report-panel">
      <div className="panel-heading">
        <div>
          <h3>Report a Campus Issue</h3>

          <p>
            Help us identify and fix campus problems.
          </p>
        </div>

        <span className="heading-icon">✎</span>
      </div>

      <form onSubmit={handleSubmit}>
        <button
          type="button"
          onClick={checkLocation}
          disabled={locationStatus === "checking"}
          className="submit-btn"
        >
          {locationStatus === "checking"
            ? "Detecting Location..."
            : "📍 Check My Location"}
        </button>

        {locationMessage && (
          <p className="message">
            {locationMessage}
          </p>
        )}

        <label>Detected Campus</label>

        <input
          value={
            locationStatus === "inside"
              ? CAMPUS_LOCATION.name
              : ""
          }
          readOnly
          placeholder="Check your location to detect campus"
        />

        <label>Block / Location</label>

        <select
          name="location"
          value={form.location}
          onChange={handleChange}
        >
          <option value="">
            Select your location
          </option>

          <option>Block A</option>
          <option>Block B</option>
          <option>Block C</option>
          <option>Block D</option>
          <option>Computer Lab</option>
          <option>Library</option>
          <option>Admin Block</option>
          <option>Other</option>
        </select>

        <label>Issue Category</label>

        <select
          name="category"
          value={form.category}
          onChange={handleChange}
        >
          <option value="">
            Select a category
          </option>

          <option>Technical</option>
          <option>Electrical</option>
          <option>Cleanliness</option>
          <option>Maintenance</option>
          <option>Water Supply</option>
          <option>Other</option>
        </select>

        <label>Issue Description</label>

        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          placeholder="Describe the issue you noticed..."
          rows="4"
        />

        <button
          type="submit"
          className="submit-btn"
          disabled={submitting}
        >
          {submitting
            ? "Submitting..."
            : "Submit Issue →"}
        </button>

        {message && (
          <p className="message">
            {message}
          </p>
        )}
      </form>
    </div>
  );

  // =========================
  // ISSUE LIST
  // =========================
  const renderIssueList = (list) => {
    if (loading) {
      return <p>Loading issues...</p>;
    }

    if (list.length === 0) {
      return (
        <div className="empty-state">
          <div className="empty-icon">📋</div>

          <h4>No issues reported yet</h4>

          <p>
            Campus issues you report will appear here.
          </p>
        </div>
      );
    }

    return (
      <div className="issue-list">
        {list.map((issue) => (
          <div
            className="issue-item"
            key={issue.id}
          >
            <div className="issue-icon">
              📍
            </div>

            <div className="issue-details">
              <strong>
                {issue.category}
              </strong>

              <p>{issue.location}</p>

              <small>
                {issue.description}
              </small>

              <span className="issue-date">
                {issue.createdAt || ""}
              </span>
            </div>

            <div className="issue-actions">
              <span className="status">
                {issue.status || "Reported"}
              </span>

              {(issue.status || "Reported") ===
                "Reported" && (
                <button
                  className="cancel-btn"
                  onClick={() =>
                    cancelIssue(issue.id)
                  }
                >
                  Cancel Request
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // =========================
  // NAVIGATION
  // =========================
  const navItems = [
    {
      name: "Dashboard",
      icon: "▦",
    },
    {
      name: "Report an Issue",
      icon: "＋",
    },
    {
      name: "Issue History",
      icon: "◷",
    },
  ];
  // =========================
// SPLASH SCREEN
// =========================
if (showSplash) {
  return (
    <div className={`splash-screen ${splashExiting ? "splash-exit" : ""}`}>
      <div className="splash-logo">
        <div className="splash-logo-inner">
          C
        </div>
      </div>

      <h1 className="splash-title">
        Campus<span>Live</span>
      </h1>

      <p className="splash-tagline">
        Your Campus. Your Voice.
      </p>
    </div>
  );
}
  // =========================
  // LOGIN SCREEN
  // =========================
  if (!isLoggedIn) {
    return (
      <div className="login-page">

        {/* LEFT SIDE */}
        <div className="login-visual">

          <div className="login-circle one"></div>
          <div className="login-circle two"></div>

          <div className="login-visual-content">

            <div className="login-brand">
              Campus<span>Live</span>
            </div>

            <p className="login-tagline">
              Your Campus. Your Voice.
            </p>

            {/* CAMPUS ILLUSTRATION */}
            <div className="campus-illustration">

              <div className="campus-building">

                <div className="campus-roof"></div>

                <div className="campus-window one"></div>
                <div className="campus-window two"></div>
                <div className="campus-window three"></div>
                <div className="campus-window four"></div>

                <div className="campus-door"></div>

              </div>

            </div>

            <p className="login-description">
              Report campus issues, track their progress,
              and help create a better campus experience
              for everyone.
            </p>

          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="login-form-section">

          <div className="login-box">

            <div className="login-small-label">
              WELCOME BACK
            </div>

            <h1>
              Login to CampusLive
            </h1>

            <p>
              Sign in to access your campus dashboard.
            </p>

            <form onSubmit={handleLogin}>

              <label htmlFor="login-email">
                Email Address
              </label>

              <input
                id="login-email"
                type="email"
                name="email"
                value={loginForm.email}
                onChange={handleLoginChange}
                placeholder="Enter your email"
                autoComplete="email"
              />

              <label htmlFor="login-password">
                Password
              </label>

              <input
                id="login-password"
                type="password"
                name="password"
                value={loginForm.password}
                onChange={handleLoginChange}
                placeholder="Enter your password"
                autoComplete="current-password"
              />

              <button
                type="submit"
                disabled={loginLoading}
              >
                {loginLoading
                  ? "Logging in..."
                  : "Login to CampusLive →"}
              </button>

            </form>

            {loginMessage && (
              <p className="login-message">
                {loginMessage}
              </p>
            )}

            <div className="login-footer">
              Secure campus access • CampusLive © 2026
            </div>

          </div>

        </div>

      </div>
    );
  }

  // =========================
  // MAIN CAMPUSLIVE APP
  // =========================
  return (
    <div className="app">

      <aside className="sidebar">

        <h2 className="logo">
          Campus<span>Live</span>
        </h2>

        <p className="side-label">
          WORKSPACE
        </p>

        {navItems.map((item) => (
          <div
            key={item.name}
            className={`nav-item ${
              activePage === item.name
                ? "active"
                : ""
            }`}
            onClick={() => {
              setActivePage(item.name);
              setMessage("");
            }}
          >
            {item.icon} &nbsp; {item.name}
          </div>
        ))}

        <div className="sidebar-bottom">

          <div className="profile-avatar">
            {currentUser?.name
              ? currentUser.name
                  .charAt(0)
                  .toUpperCase()
              : "R"}
          </div>

          <div>

            <strong>
              {currentUser?.name ||
                "Campus User"}
            </strong>

            <p>
              {currentUser?.role ||
                "Student"}
            </p>

          </div>

        </div>

      </aside>

      <main className="main-content">

        <header className="topbar">

          <div>

            <p className="breadcrumb">
              Workspace / {activePage}
            </p>

            <h2>
              {activePage === "Dashboard"
                ? "Campus Dashboard"
                : activePage}
            </h2>

          </div>

          <div className="live-badge">
            <span className="live-dot"></span>
            CampusLive
          </div>

        </header>

        {/* DASHBOARD */}

        {activePage === "Dashboard" && (
          <>

            <section className="welcome">

              <div>

                <p className="welcome-tag">
                  YOUR CAMPUS, CONNECTED
                </p>

                <h1>
                  Good day,{" "}
                  {currentUser?.name ||
                    "Campus User"}!
                </h1>

                <p>
                  A better campus starts with
                  you. Report issues and help
                  make your campus a better
                  place.
                </p>

              </div>

              <div className="welcome-icon">
                🏫
              </div>

            </section>

            <section className="stats-grid">

              <div className="stat-card">

                <div className="stat-icon purple">
                  ▤
                </div>

                <p>Total Issues</p>

                <h2>
                  {issues.length}
                </h2>

                <span>
                  Issues reported here
                </span>

              </div>

              <div className="stat-card">

                <div className="stat-icon orange">
                  ◷
                </div>

                <p>Pending Issues</p>

                <h2>
                  {issues.filter(
                    (i) =>
                      (i.status ||
                        "Reported") ===
                      "Reported"
                  ).length}
                </h2>

                <span>
                  Awaiting attention
                </span>

              </div>

              <div className="stat-card">

                <div className="stat-icon green">
                  ✓
                </div>

                <p>Resolved Issues</p>

                <h2>
                  {issues.filter(
                    (i) =>
                      i.status ===
                      "Resolved" ||
                      i.status ===
                      "Completed"
                  ).length}
                </h2>

                <span>
                  Successfully resolved
                </span>

              </div>

            </section>

            <section className="content-grid">

              {renderReportForm()}

              <div className="panel activity-panel">

                <div className="panel-heading">

                  <div>

                    <h3>
                      Recent Issues
                    </h3>

                    <p>
                      Your recently reported
                      campus issues.
                    </p>

                  </div>

                  <span className="heading-icon">
                    ▤
                  </span>

                </div>

                {renderIssueList(
                  issues.slice(0, 5)
                )}

                <button
                  className="submit-btn"
                  onClick={() =>
                    setActivePage(
                      "Issue History"
                    )
                  }
                >
                  View All Issues →
                </button>

              </div>

            </section>

          </>
        )}

        {/* REPORT ISSUE */}

        {activePage ===
          "Report an Issue" && (
          <section className="content-grid">
            {renderReportForm()}
          </section>
        )}

        {/* ISSUE HISTORY */}

        {activePage ===
          "Issue History" && (
          <section className="panel history-panel">

            <div className="panel-heading">

              <div>

                <h3>
                  Issue History
                </h3>

                <p>
                  All reported campus
                  issues.
                </p>

              </div>

            </div>

            {renderIssueList(issues)}

          </section>
        )}

        <footer>

          <span>
            © 2026 CampusLive
          </span>

          <span>
            Making campus life better,
            together.
          </span>

        </footer>

      </main>

    </div>
  );
}

export default App;