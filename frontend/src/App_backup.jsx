
import { useState, useEffect } from "react";
import "./App.css";

const API_URL = "http://127.0.0.1:8000";

function App() {
  const [issues, setIssues] = useState([]);
  const [activePage, setActivePage] = useState("Dashboard");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    location: "",
    category: "",
    description: "",
  });

  // Load saved issues from the backend
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

  useEffect(() => {
    loadIssues();
  }, []);

  // Handle form inputs
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Submit issue to FastAPI
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.location.trim() || !form.category || !form.description.trim()) {
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
        throw new Error(result.detail || "Could not submit issue");
      }

      setForm({
        location: "",
        category: "",
        description: "",
      });

      setMessage("Issue reported successfully!");

      // Refresh the issue list from the database
      await loadIssues();
    } catch (error) {
      console.error("Error submitting issue:", error);
      setMessage("Failed to submit issue. Check your backend.");
    } finally {
      setSubmitting(false);
    }
  };

  // Reusable report form
  const renderReportForm = () => (
    <div className="panel report-panel">
      <div className="panel-heading">
        <div>
          <h3>Report a Campus Issue</h3>
          <p>Help us identify and fix campus problems.</p>
        </div>
        <span className="heading-icon">✎</span>
      </div>

      <form onSubmit={handleSubmit}>
        <label>Location</label>
        <input
          name="location"
          value={form.location}
          onChange={handleChange}
          placeholder="e.g. Block C - Computer Lab"
        />

        <label>Issue Category</label>
        <select
          name="category"
          value={form.category}
          onChange={handleChange}
        >
          <option value="">Select a category</option>
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
          {submitting ? "Submitting..." : "Submit Issue →"}
        </button>

        {message && <p className="message">{message}</p>}
      </form>
    </div>
  );

  // Reusable issue list
  const renderIssueList = (list) => {
    if (loading) return <p>Loading issues...</p>;

    if (list.length === 0) {
      return (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <h4>No issues reported yet</h4>
          <p>Campus issues you report will appear here.</p>
        </div>
      );
    }

    return (
      <div className="issue-list">
        {list.map((issue) => (
          <div className="issue-item" key={issue.id}>
            <div className="issue-icon">📍</div>

            <div className="issue-details">
              <strong>{issue.category}</strong>
              <p>{issue.location}</p>
              <small>{issue.description}</small>
              <span className="issue-date">
                {issue.createdAt || ""}
              </span>
            </div>

            <span className="status">
              {issue.status || "Reported"}
            </span>
          </div>
        ))}
      </div>
    );
  };

  const navItems = [
    { name: "Dashboard", icon: "▦" },
    { name: "Report an Issue", icon: "＋" },
    { name: "Issue History", icon: "◷" },
  ];

  return (
    <div className="app">
      <aside className="sidebar">
        <h2 className="logo">
          Campus<span>Live</span>
        </h2>

        <p className="side-label">WORKSPACE</p>

        {navItems.map((item) => (
          <div
            key={item.name}
            className={`nav-item ${
              activePage === item.name ? "active" : ""
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
          <div className="profile-avatar">R</div>
          <div>
            <strong>Campus User</strong>
            <p>Student Account</p>
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
            <span className="live-dot"></span> CampusLive
          </div>
        </header>

        {activePage === "Dashboard" && (
          <>
            <section className="welcome">
              <div>
                <p className="welcome-tag">
                  YOUR CAMPUS, CONNECTED
                </p>
                <h1>Good day! 👋</h1>
                <p>
                  A better campus starts with you. Report issues
                  and help make your campus a better place.
                </p>
              </div>
              <div className="welcome-icon">🏫</div>
            </section>

            <section className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon purple">▤</div>
                <p>Total Issues</p>
                <h2>{issues.length}</h2>
                <span>Issues reported here</span>
              </div>

              <div className="stat-card">
                <div className="stat-icon orange">◷</div>
                <p>Pending Issues</p>
                <h2>
                  {issues.filter(
                    (i) => (i.status || "Reported") === "Reported"
                  ).length}
                </h2>
                <span>Awaiting attention</span>
              </div>

              <div className="stat-card">
                <div className="stat-icon green">✓</div>
                <p>Resolved Issues</p>
                <h2>
                  {issues.filter((i) => i.status === "Resolved").length}
                </h2>
                <span>Successfully resolved</span>
              </div>
            </section>

            <section className="content-grid">
              {renderReportForm()}

              <div className="panel activity-panel">
                <div className="panel-heading">
                  <div>
                    <h3>Recent Issues</h3>
                    <p>Your recently reported campus issues.</p>
                  </div>
                  <span className="heading-icon">▤</span>
                </div>

                {renderIssueList(issues.slice(0, 5))}

                <button
                  className="submit-btn"
                  onClick={() => setActivePage("Issue History")}
                >
                  View All Issues →
                </button>
              </div>
            </section>
          </>
        )}

        {activePage === "Report an Issue" && (
          <section className="content-grid">
            {renderReportForm()}
          </section>
        )}

        {activePage === "Issue History" && (
          <section className="panel history-panel">
            <div className="panel-heading">
              <div>
                <h3>Issue History</h3>
                <p>All reported campus issues.</p>
              </div>
            </div>

            {renderIssueList(issues)}
          </section>
        )}

        <footer>
          <span>© 2026 CampusLive</span>
          <span>Making campus life better, together.</span>
        </footer>
      </main>
    </div>
  );
}

export default App;