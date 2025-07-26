const express = require("express");
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 5000;
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cookieParser = require("cookie-parser");
app.use(cookieParser());

const jwt = require("jsonwebtoken");
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://taskhub.surge.sh",
      "https://taskbucks-4a4ba.web.app",
      "https://taskbucks-4a4ba.firebaseapp.com",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);



app.use(express.json());
app.use(cookieParser());

const stripe = require("stripe")(process.env.Stripe_Secrect_key);

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.eatq1.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});


async function run() {
  try {

    // User API
    app.post("/jwt", async (req, res) => {
      const user = req.body;

      const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
        expiresIn: "72h",
      });
      res.cookie("token", token).send({ success: true, token });
    });
function VerifyToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).send({ message: "Access Denied - No Token Found" });
  }

  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, (err, user) => {
    if (err) return res.status(403).send({ message: "Invalid Token" });
    req.user = user;
    next();
  });
}

    app.get("/users", async (req, res) => {
      const userDB = client.db("MicroTask").collection("users");
      const email = req.query?.email;

      const user = await userDB.findOne({ email });
      if (!user) {
        const cursor = userDB.find({});
        const result = await cursor.toArray();
        return res.send(result);
      }
      res.send(user);
    });

    app.post("/users", async (req, res) => {
      const userDB = client.db("MicroTask").collection("users");
      const user = req.body;
      const result = await userDB.insertOne(user);
      res.send(result);
    });

    app.patch("/users", VerifyToken, async (req, res) => {
      const email = req.query.email;
      const { balance } = req.body;

      if (!email || balance === undefined) {
        return res
          .status(400)
          .json({ message: "Email and balance are required" });
      }

      const userDB = client.db("MicroTask").collection("users");

      const result = await userDB.updateOne(
        { email: email },
        { $set: { balance: balance } }
      );

      res.send({ message: "Balance updated successfully", result });
    });

    app.delete("/users/:id", VerifyToken, async (req, res) => {
      const id = req.params.id;
      const userDB = client.db("MicroTask").collection("users");
      const query = { _id: new ObjectId(id) };
      const result = await userDB.deleteOne(query);
      res.send(result);
    });

    app.post("/logout", VerifyToken, (req, res) => {
      res.clearCookie("token");
      res.send({ message: "Logged out Successfully" });
    });

    app.post("/tasks", VerifyToken, async (req, res) => {
      const userDB = client.db("MicroTask").collection("task");
      const user = req.body;
      const result = await userDB.insertOne(user);
      res.send(result);
    });
    app.get("/tasks", async (req, res) => {
      const userDB = client.db("MicroTask").collection("task");
      const email = req.query.email;

      try {
        let tasks;

        if (email) {
          tasks = await userDB
            .find({ "task.created_by.email": email })
            .toArray();
        } else {
          // Fetch all tasks
          tasks = await userDB.find({}).toArray();
        }

        return res.send(tasks);
      } catch (error) {
        console.error("Failed to fetch tasks:", error);
        res.status(500).send({ error: "Internal server error" });
      }
    });
    app.get("/tasks/:id", VerifyToken, async (req, res) => {

      const userDB = client.db("MicroTask").collection("task");
      const id = req.params.id;
      let tasks;

      if (id) {
        tasks = await userDB.find({ _id: new ObjectId(id) }).toArray();
      } else {
        // Fetch all tasks
        tasks = await userDB.find({}).toArray();
      }

      res.send(tasks);
    });

    app.post("/submissions", VerifyToken, async (req, res) => {
      const userDB = client.db("MicroTask").collection("submission");
      const user = req.body;
      const result = await userDB.insertOne(user);
      res.send(result);
    });
    app.get("/submissions", VerifyToken, async (req, res) => {
      try {
        const { worker_email, Buyer_email, status } = req.query;
        const userDB = client.db("MicroTask").collection("submission");

        const query = {};
        if (worker_email) {
          query["submissionData.worker_email"] = worker_email;
        }
        if (Buyer_email) {
          query["submissionData.Buyer_email"] = Buyer_email;
        }
        if (status) {
          query["submissionData.status"] = status;
        }

        const submissions = await userDB
          .find(query)
          .sort({ "submissionData.current_date": -1 }) // Fix sorting field path
          .toArray();

        res.send({ result: submissions });
      } catch (err) {
        console.error("Error fetching submissions:", err);
        res.status(500).send({ error: "Internal Server Error" });
      }
    });

    app.get("/submissions/:id", VerifyToken, async (req, res) => {
      const submissionId = req.params.id;

      const userDB = client.db("MicroTask").collection("submission");
      let result;
      if (submissionId) {
        result = await userDB
          .find({ _id: submissionId })
          .sort({ current_date: -1 })
          .toArray();
      }
      if (Email) {
        result = await userDB
          .find({ "submissionData.Buyer_email": Email })
          .sort({ current_date: -1 })
          .toArray();
      }

      res.send({ result });
    });

    app.patch("/submissions/:id", VerifyToken, async (req, res) => {
      try {
        const userDB = client.db("MicroTask").collection("submission");
        const submissionId = req.params.id;
        const { status } = req.body;

        const updateResult = await userDB.updateOne(
          { _id: new ObjectId(submissionId) },
          { $set: { "submissionData.status": status } }
        );

        if (updateResult.matchedCount === 0) {
          return res.status(404).send({ error: "Submission not found." });
        }

        const updatedDoc = await userDB.findOne({
          _id: new ObjectId(submissionId),
        });

        res.send({ message: "Update successful", updatedDoc });
      } catch (err) {
        console.error("Error updating submission:", err);
        res.status(500).send({ error: "Internal Server Error" });
      }
    });

    app.get("/checkout", VerifyToken, async (req, res) => {
      const userDB = client.db("MicroTask").collection("checkout");
      const email = req.query.email;
      let tasks;

      if (email) {
        tasks = await userDB.find({ email: email }).toArray();
      } else {
        // Fetch all tasks
        tasks = await userDB.find({}).toArray();
      }
      res.send(tasks);
    });
    app.post("/checkout", VerifyToken, async (req, res) => {
      const userDB = client.db("MicroTask").collection("checkout");
      const user = req.body;
      const result = await userDB.insertOne(user);
      res.send(result);
    });
    app.post("/create-payment-intent", VerifyToken, async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.json({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      });
    });

    app.post("/update-balance", VerifyToken, async (res, req) => {
      const userDB = client.db("MicroTask").collection("micro");
      const user = req.body;
      const result = await userDB.insertOne(user);
      res.send(result);
    });
  } finally {
    // Ensures that the client will close when you finish/error
    //   await client.close();
  }
}
run();

app.get("/", async (req, res) => {
  res.send("Task hub pro!");
});

app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});
