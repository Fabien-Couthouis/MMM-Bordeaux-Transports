//Node_helper for : MMM-Bordeaux-Transport

//Modules nodejs requis par le node helper
var NodeHelper = require("node_helper");
var request = require('request');

module.exports = NodeHelper.create({

  // À exécuter lors du démarrage du miroir
  start: function() {
    console.log("MMM-Bordeaux-Traansports helper started ...");
  },


  //Exemple de requête via url
  exempleRequest: function() {
    let url ="myApiUrl";
    var self = this;

    request({ url: url }, function(error, response, body) {
      if (error || response.statusCode !== 200) {
        return console.log(error || { statusCode: response.statusCode });
      }
      else {
        //Traiter notre réponse "response"

        //On peut ensuite envoyer une notification au module (payload = contenu de la notification)
        self.sendSocketNotification("EXAMPLE_NAME", examplePayload);
      }
    });
  },


  //Traiter ici les notifications provenant du module
  //Rappel : une notification est composée d'un nom (NOM_NOTIFICATION) et d'un payload (contenuNotification)
  //le mot clé "socket" indique que la notification est INTERNE au module 
  socketNotificationReceived: function(notification, payload) {
  }
});
