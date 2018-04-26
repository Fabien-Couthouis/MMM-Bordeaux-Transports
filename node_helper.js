//Node_helper for : MMM-Bordeaux-Transport

//Modules nodejs requis par le node helper
var NodeHelper = require("node_helper");
var request = require('request');

module.exports = NodeHelper.create({

  // À exécuter lors du démarrage du miroir
  start: function() {
    console.log("MMM-Bordeaux-Transports helper started ...");
  },


  //Exemple de requête via url
  navitiaRequest: function() {

    let from = this.config.homeLatitude + "%3B" + this.config.homeLongitude;
    let to = this.config.goTo_lat + "%3B" + this.config.goTo_lon;

    // let url = "https://api.navitia.io/v1/coverage/fr-sw/journeys?from=" + from + "&to=" + to + "&datetime=" + this.config.beginTime + "&";
    let url = "https://api.navitia.io/v1/coverage/fr-sw/journeys?from=-0.5880840000000001%3B44.815068&to=-0.5976359999999999%3B44.806078&";


    var self = this;
    /*
    request() ({ url: url }, function(error, response, body) {
      if (error || response.statusCode !== 200) {
        return console.log(error || { statusCode: response.statusCode });
      }
      else {
        //Traiter notre réponse "response"
        let payload = response;

        console.log(payload);
        //On peut ensuite envoyer une notification au module (payload = contenu de la notification)
        //self.sendSocketNotification("NAVITIA_RESULT", payload);
      }
    });*/


    let options = {
      url: url,
      auth: {
        username: this.config.navitiaKey,
        password: this.config.mdp
      }
    };

    request.get(options, function(error, response, body) {
      if (error || response.statusCode !== 200) {
        return console.log(error || { statusCode: response.statusCode });
      }
      else {
        //Traiter notre réponse "response"
        let payload = response;

        console.log(payload);
        //On peut ensuite envoyer une notification au module (payload = contenu de la notification)
        //self.sendSocketNotification("NAVITIA_RESULT", payload);
      }
    });

  },


  //Traiter ici les notifications provenant du module
  //Rappel : une notification est composée d'un nom (NOM_NOTIFICATION) et d'un payload (contenuNotification)
  //le mot clé "socket" indique que la notification est INTERNE au module 
  socketNotificationReceived: function(notification, payload) {
    switch (notification) {
      case "GET_CONFIG":
        // On charge la config (coordonnées miroir, key) on start of module
        this.config = payload;
        break;

      case "UPDATE_EVENT_INFO":        
        // On charge la config
        this.config.goTo_lat = 44.806287; //payload.goTo_lat;
        this.config.goTo_lon = -0.596923; //payload.goTo_lon;
        this.config.beginTime = "20180427T151700"; //payload.time;
        //Et on exécute l'url de requete de navitia
        this.navitiaRequest();
        break;
  }
}
});
