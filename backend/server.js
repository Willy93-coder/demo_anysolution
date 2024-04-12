const express = require("express");
const app = express();
const fetch = require("node-fetch");
const cors = require("cors");
const cron = require("node-cron");
const { json } = require("express/lib/response");
const { jsonTaskCron } = require("./utils");
const PORT = 3005;

app.use(cors({
  origin: '*',
  methods: ['POST', 'GET', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept']
}));

app.use(express.json());

// endpoint de crear entidades
app.post("/create-entity", async (req, res) => {
  try {
    const entityData = req.body;
    const requestOptions = {
      method: "POST",
      headers: {
        "Content-type": "application/json",
      },
      body: JSON.stringify(entityData),
    };
    const contextBrokerUrl = "http://www.anysolution.org:1027/v2/entities";
    const response = await fetch(contextBrokerUrl, requestOptions);
    res.sendStatus(response.status);
  } catch (error) {
    console.error("Error al enviar la entidad al Context Broker", error);
  }
});

// endpoint obtener entidades
app.get("/get-entities", async (req, res) => {
  try {
    const contextBrokerUrl = `http://www.anysolution.org:1027/v2/entities/`;
    const requestOptions = {
      method: "GET",
    };

    const response = await fetch(contextBrokerUrl, requestOptions);
    const data = await response.json();
    res.json(data);
  } catch (e) {
    console.error("Error al obtener las entidades del Context Broker", e);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// endpoint obtener suscripciones
app.get("/get-subscriptions", async (req, res) => {
  try {
    const contextBrokerUrl = `http://www.anysolution.org:1027/v2/subscriptions/`;
    const requestOptions = {
      method: "GET",
    };

    const response = await fetch(contextBrokerUrl, requestOptions);
    const data = await response.json();
    res.json(data);
  } catch (e) {
    console.error("Error al obtener las subscripciones del Context Broker", e);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// endpoint crear suscripciones
app.post("/create-subscription", async (req, res) => {
  try {
    const subsData = req.body;
    const contextBrokerUrl = `http://www.anysolution.org:1027/v2/subscriptions/`;
    const requestOptions = {
      method: "POST",
      headers: {
        "Content-type": "application/json",
      },
      body: JSON.stringify(subsData),
    };

    const response = await fetch(contextBrokerUrl, requestOptions);
    res.sendStatus(response.status);
  } catch (e) {
    console.error("Error al crear la subscripcion al Context Broker", e);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// endpoint borrar suscripciones
app.post("/delete-subscription", async (req, res) => {
  try {
    const subsData = req.body;
    const subscId = subsData.id;
    const contextBrokerUrl = `http://www.anysolution.org:1027/v2/subscriptions/${subscId}`;
    const requestOptions = {
      method: "DELETE",
    };

    const response = await fetch(contextBrokerUrl, requestOptions);
    res.sendStatus(response.status);
  } catch (e) {
    console.error("Error al eliminar la subscripcion al Context Broker", e);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// endpoint borrar entidades y suscripciones que tenga que ver con las entidades acopladas en ellas
app.post("/delete-entity", async (req, res) => {
  try {
    const entData = req.body;
    const entId = entData.id;
    const contextBrokerUrl = `http://www.anysolution.org:1027/v2/entities/${entId}`;
    const subscriptionUrl = `http://www.anysolution.org:1027/v2/subscriptions`;

    // Usa un GET para obtener la info de todas las suscripciones
    const subscriptionRequestOptions = {
      method: "GET",
    };

    const subscriptionResponse = await fetch(
      subscriptionUrl,
      subscriptionRequestOptions
    );
    const subscriptions = await subscriptionResponse.json();

    // Va buscando la suscripción que tenga esa entidad
    for (const subscription of subscriptions) {
      const isAssociated = subscription.subject.entities.some(
        (entity) => entity.id === entId
      );

      if (isAssociated) {
        const deleteSubscriptionUrl = `${subscriptionUrl}/${subscription.id}`;
        const deleteSubscriptionOptions = {
          method: "DELETE",
        };
        await fetch(deleteSubscriptionUrl, deleteSubscriptionOptions);
      }
    }

    // Elimina la entidad
    const deleteEntityOptions = {
      method: "DELETE",
    };

    const response = await fetch(contextBrokerUrl, deleteEntityOptions);
    res.sendStatus(response.status);
  } catch (e) {
    console.error("Error al eliminar la entidad al Context Broker", e);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

app.post("/create-task-cron", async (req, res) => {
  try {
    const data = req.body;
    if (
      Object.keys(data.url).length === 0 ||
      Object.keys(data.ngsi).length === 0
    ) {
      res.sendStatus(400);
      return;
    }
    console.log(JSON.stringify(data));
    await jsonTaskCron(JSON.stringify(data, null, 2));
    // Escribir archivo json para saber las tareas. Asociar cada url con el array de ngsi.
    // Añadir cada vez que se llama al post
    res.sendStatus(200);
  } catch (e) {
    console.error("Error al crear el jsonTaskCron");
  }
});

// cron.schedule('*/5 * * * * *', () => {
//     // Recorrer el jsonTaskCron
//     // Por cada url obtener los datos que se han usado para crear el ngsi
//     // Tener una funcion que obtenga los datos de la url y la transforme a ngsi para actualizar los datos
//     console.log('running a task every 5 seconds');
// });

app.listen(PORT, () => {
  console.log(`🚀 Servidor Express escuchando en el puerto ${PORT}`);
});
