# 🎗️ Breast Cancer Detection System

<p align="center">
  <img src="https://img.shields.io/badge/React-Vite-61DAFB?style=for-the-badge&logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/Scikit--Learn-F7931E?style=for-the-badge&logo=scikit-learn&logoColor=white" />
  <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" />
</p>

> An AI-powered full-stack web application that predicts breast cancer risk (Benign vs Malignant) using a trained machine learning model — built with React + Vite on the frontend and FastAPI on the backend.

---

## 📸 Preview

> *(Add a screenshot or screen recording of the app here)*

---

## ✨ Features

- 🔍 **Cancer Risk Prediction** — Classifies tumors as Benign or Malignant using an ML model trained on the Wisconsin Breast Cancer Dataset
- 📊 **Probability Visualization** — Interactive charts showing prediction confidence for both classes
- 📄 **PDF Report Download** — Generate and download a detailed diagnosis report with a single click
- 📤 **CSV Upload Support** — Upload patient feature data via CSV for batch or single predictions
- 🎨 **Modern Medical UI** — Clean, professional interface built with React + Vite and custom CSS
- ⚡ **Fast REST API** — Powered by FastAPI for low-latency ML inference

---

## 🧠 Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| React (Vite) | UI framework & build tool |
| Axios | HTTP client for API calls |
| CSS (Custom) | Styling & medical-grade UI |

### Backend
| Technology | Purpose |
|---|---|
| FastAPI | REST API framework |
| Scikit-learn | ML model training & inference |
| Pandas / NumPy | Data processing |
| Joblib | Model serialization |

---

## 📂 Project Structure

```
breast-cancer-detection/
├── backend/
│   ├── main.py              # FastAPI app & prediction endpoints
│   ├── model/
│   │   └── model.pkl        # Trained ML model (Joblib)
│   ├── utils/
│   │   └── predict.py       # Preprocessing & inference logic
│   └── requirements.txt     # Python dependencies
│
├── frontend/
│   ├── src/
│   │   ├── components/      # Reusable React components
│   │   ├── pages/           # App pages (Home, Result, etc.)
│   │   └── App.jsx          # Root component
│   ├── public/
│   ├── index.html
│   └── vite.config.js
│
├── .gitignore
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18
- Python >= 3.9
- pip

---

### 1. Clone the Repository

```bash
git clone https://github.com/Balwantsahani18/breast-cancer-detection.git
cd breast-cancer-detection
```

---

### 2. Setup the Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

The API will start at `http://localhost:8000`

You can explore the auto-generated docs at `http://localhost:8000/docs`

---

### 3. Setup the Frontend

```bash
cd frontend
npm install
npm run dev
```

The app will start at `http://localhost:5173`

---

## 🧪 How It Works

1. **Input** — The user enters tumor feature values manually or uploads a CSV file
2. **API Call** — The frontend sends the data to the FastAPI `/predict` endpoint
3. **Inference** — The backend preprocesses the input and runs it through the trained ML model
4. **Result** — The prediction (Benign / Malignant) and probability scores are returned
5. **Report** — The user can download a full PDF diagnosis report

---

## 📊 Model Details

| Property | Detail |
|---|---|
| Dataset | Wisconsin Breast Cancer Diagnostic Dataset |
| Features | 30 numeric features (radius, texture, perimeter, area, etc.) |
| Target | Binary classification — Benign (0) / Malignant (1) |
| Algorithm | *(e.g., Random Forest / SVM / Logistic Regression — update this)* |
| Accuracy | *(Add your model's accuracy here)* |

---

## 🌐 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/predict` | Predict cancer from feature values |
| `POST` | `/predict-csv` | Predict from uploaded CSV file |
| `GET` | `/health` | Health check |

---

## 📦 Environment Variables

Create a `.env` file inside the `frontend/` directory if needed:

```env
VITE_API_URL=http://localhost:8000
```

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

1. Fork the repo
2. Create a new branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'Add your feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

---

## ⚠️ Disclaimer

This application is intended for **educational and research purposes only**. It is **not** a substitute for professional medical diagnosis. Always consult a licensed medical professional for any health concerns.

---

## 👤 Author

**Balwant Sahani**
- GitHub: [@Balwantsahani18](https://github.com/Balwantsahani18)

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

<p align="center">Made with ❤️ for early cancer detection awareness</p>