/* Timetable for Bordeaux, France local transport Module */

/* Magic Mirror
 * Module: MMM-Bordeaux-Traansport
 * By Raphaël Brès && Fabien Couthouis, ENSC
 */

Module.register("MMM-Bordeaux-Transports", {
  // Definition des paramètres de configuration par défaut, accessibles via this.config.nomVariable
  defaults: {
    updateInterval: 1 * 60 * 1000, //temps de rafraichissement en ms
    homeLatitude: 44.810787, //https://www.coordonnees-gps.fr
    homeLongitude: -0.591106,
    navitiaKey: "3cb5aaa3-2743-42f8-929c-b5f36ff64cb9"
  },

  // Récupère les feuilles de style (fontawesome pour les icones, à virer si inutile)
  getStyles: function() {
    return ["MMM-Bordeaux-Transports.css", "font-awesome.css"];
  },

  // Comportement au démarrage
  start: function() {
    Log.info("Starting module: " + this.name);
    console.log("AAAAAAAAAAAAAAAAAAA");
    var self = this;

    //Rafraichissement de l'affichage et des informations
    setInterval(function() {
      self.updateDom();
    }, self.config.updateInterval);
  },

  //Permet de convertir un horaire format timestamp donné par le calendrier Google en un format hh:mm:ss
  convertTimestamp: function(timestamp) {
    // Create a new JavaScript Date object based on the timestamp
    // multiplied by 1000 so that the argument is in milliseconds, not seconds.
    let date = new Date(timestamp * 1000);
    // Hours part from the timestamp
    let hours = date.getHours();
    // Minutes part from the timestamp
    let minutes = "0" + date.getMinutes();
    // Seconds part from the timestamp
    let seconds = "0" + date.getSeconds();

    //(Possibilité de virer les secondes si inutile, ou bien de renvoyer un autre format)
    // Will display time in 10:30:23 format
    let formattedTime = hours + ":" + minutes.substr(-2) + ":" + seconds.substr(-2);

    return formattedTime;
  },

  // Override le générateur du Dom, à changer pour l'affichage
  getDom: function() {
    const wrapper = document.createElement("div");

    // ...

    return wrapper;
  },

  //Notifications
  //Rappel : une notification est composée d'un nom (NOM_NOTIFICATION) et d'un payload (contenuNotification)

  // Gère les notifications INTERNES au module (interactions avec le node_helper)
  socketNotificationReceived: function(notification, payload) {},

  //Gère les notifications inter-modules
  notificationReceived: function(notification, payload) {
    switch (notification) {
      case "CALENDAR_EVENTS":
      //Exemple de traitement de la donnée events
        const events = payload;
        const event1 = events[0];
        const event1Location = event1.location;
        const event1Startdate = event1.startDate;
        const formattedStartDate = this.convertTimestamp(event1Startdate);

        //plus d'infos via :
        //console.log(payload);
        break;
    }
  }
});
