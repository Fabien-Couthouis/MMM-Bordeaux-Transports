//Node_helper for : MMM-Bordeaux-Transport

//Modules nodejs requis par le node helper
var NodeHelper = require("node_helper");
var request = require("request");

module.exports = NodeHelper.create({
  // À exécuter lors du démarrage du miroir
  start: function() {
    console.log("MMM-Bordeaux-Transports helper started ...");
  },


  fetchNavitia: function(url, moment="NOW") {
    let self = this;
    let options = {
      url: url,
      auth: { username: this.config.navitiaKey, password: this.config.mdp }
    };
    request.get(options, function(error, response, body) {
      if (error || response.statusCode !== 200) {
        self.sendSocketNotification("NAVITIA_RESULT_" + moment, null);
        return console.log(error || { statusCode: response.statusCode });

      } else {
        //Traiter notre réponse "body", qui est le contenu de "response", on récupère ce dont on a besoin
        json = JSON.parse(body);
        //console.log(body) //http://jsonviewer.stack.hu pour voir le fichier sous un format agréable et lisible

        //Effectue les requêtes pour les "journeys" précédents et suivants, s'ils existent
        if (moment === "NOW"){
          if (json["links"][0]["type"] === "next") {
            nextURL = json["links"][0]["href"];
            self.fetchNavitia(nextURL, "NEXT");
          }

          if (json["links"][1]["type"] === "prev") {
            prevURL = json["links"][1]["href"];
            self.fetchNavitia(prevURL, "PREV");
          }          
        }

        self.sendSocketNotification("NAVITIA_RESULT_" + moment, self.getSections(json));
      }
    });
  },

  getJourneys : function(){
    let from = this.config.homeLongitude + "%3B" + this.config.homeLatitude;
    let to = this.config.eventAddressGPS;

    let nowUrl = "https://api.navitia.io/v1/coverage/fr-sw/journeys?from=" + from + "&to=" + to + "&datetime_represents=arrival&datetime=" + this.config.arrivalTime + "&";
    this.fetchNavitia(nowUrl);
  },

  getSections: function(json) {
    //on sélectionne le voyage le plus rapide par défaut. Si on ne trouve pas de plus rapide, on prend le premier
    let journeyIndex = 0;
    let j = 0;
    do {
      if (json["journeys"][j]["type"] == "rapid" || json["journeys"][j]["type"] == "fastest") {
        journeyIndex = j;
      }
      j++;
    } while (journeyIndex === 0 && j < json["journeys"].length)

    let journey= json["journeys"][journeyIndex];
    
    //Ce qu'on va retourner. Contient toutes les sections du voyage intéressantes pour l'affichage, avec les informations utiles
    let sections = [];

    //Informations de départ
    {
      let section = journey["sections"][0];
      const sectionInfo = {
        icon: section.mode.toLowerCase(),
        info1: "Départ",
        info2: section["departure_date_time"].substring(9, 11) + "h" + section["departure_date_time"].substring(11,13),
      };
      sections.push(sectionInfo);
    }
    

    //On ajoute les correspondances à "sections"
    for (let s = 1; s < journey["sections"].length - 1; s++) {
      let section = journey["sections"][s];

      if (section["type"] == "public_transport") {
        let sectionInfo = {
          icon: section["display_informations"]["physical_mode"].toLowerCase(),
          line: section["display_informations"]["name"],
          info1: section["from"]["stop_point"]["name"],
          info2: "(" + section["display_informations"]["name"] + " > " + section["display_informations"]["headsign"] +")",
        };
        sections.push(sectionInfo);
      }      
    }

    //Informations de fin 
    {
      let lastIndex = journey["sections"].length - 1;
      let section = journey["sections"][lastIndex];
      const sectionInfo = {
        icon: "arrival",
        info1: this.nextEventLocation, //section["to"]["name"],
        info2: section["arrival_date_time"].substring(9, 11) + "h" + section["departure_date_time"].substring(11,13),
      };
      sections.push(sectionInfo);
    }
    

    return sections;
  },

  //Permet de convertir un horaire format timestamp donné par le calendrier Google en un format yyyymmddThhmmss
  convertTimestamp: function(timestamp) {
    const tzOffset = new Date().getTimezoneOffset() * 60000;
    const localISOTime = new Date(timestamp - tzOffset)
      .toISOString()
      .slice(0, -5);
    const formattedForNavitia = localISOTime
      .replace(/:/gi, "")
      .replace(/-/gi, "");
    return formattedForNavitia;
  },

  //Met à jour this.event.arrival (coordonnées du lieu du prochain événement) en fonction de l'adresse donnée
  updateGpsCoordinates(address) {
    const self = this;
    let url =
      "https://maps.googleapis.com/maps/api/geocode/json?address=" +
      address +
      "&key=" +
      this.config.googleMapKey;
    url = encodeURI(url);

    request.get(url, function(error, response, body) {
      if (error || response.statusCode !== 200) {
        return console.log(
          "Error with Google Maps API request : " + error || {
            statusCode: response.statusCode
          }
        );
      } else {
        const doc = JSON.parse(body);
        const location = doc.results[0].geometry.location;

        const res = location.lng + "%3B" + location.lat;
        self.sendSocketNotification("EVENT_INFO_FORMATTED", res);
      }
    });
  },

  //Traiter ici les notifications provenant du module
  //Rappel : une notification est composée d'un nom (NOM_NOTIFICATION) et d'un payload (contenuNotification)
  //le mot clé "socket" indique que la notification est INTERNE au module
  socketNotificationReceived: function(notification, payload) {
    switch (notification) {
      case "CONFIG":
        // On charge la config (coordonnées miroir, key) on start of module
        this.config = payload;
        break;
      case "UPDATE_EVENT_INFO":
        const nextEvent = payload;
        this.config.arrivalTime = this.convertTimestamp(nextEvent.startDate);
        this.nextEventLocation = nextEvent.location.substr(0, nextEvent.location.indexOf(',')); 
        this.updateGpsCoordinates(nextEvent.location);
        break;
      case "FETCH_NAVITIA":
        this.config.eventAddressGPS = payload;
        //On exécute la requete vers navitia
        this.getJourneys();
        break;
    }
  }
});
