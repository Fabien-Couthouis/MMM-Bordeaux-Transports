/* Timetable for Bordeaux, France local transport Module */

/* Magic Mirror
 * Module: MMM-Bordeaux-Traansport
 * By Raphaël Brès && Fabien Couthouis, ENSC
 */

Module.register("MMM-Bordeaux-Transports", {
  // Definition des paramètres de configuration par défaut, accessibles via this.config.nomVariable
  defaults: {
    updateInterval: 1 * 60 * 1000, //temps de rafraichissement en ms
    homeLatitude: 44.815051, //https://www.coordonnees-gps.fr
    homeLongitude: -0.588111,
    navitiaKey: "3cb5aaa3-2743-42f8-929c-b5f36ff64cb9",
    navitiaPswd: "fabien47",
    googleMapKey: "AIzaSyC1y4lpgvpsbjTxBczKKMjUamquldQR8AY",
  },

  // Récupère les feuilles de style (fontawesome pour les icones, à virer si inutile)
  getStyles: function() {
    return ["MMM-Bordeaux-Transports.css", "font-awesome.css"];
  },

  // Comportement au démarrage
  start: function() {
    Log.info("Starting module: " + this.name);
    const self = this;

    this.sendConfig();

    //Rafraichissement de l'affichage et des informations
    setInterval(function() {
      self.updateDom();
    }, self.config.updateInterval);
  },

    //Envoie la configuration au node helper
  sendConfig: function() {
    this.sendSocketNotification("GET_CONFIG", this.config);
  },


  // Override le générateur du Dom, à changer pour l'affichage
  getDom: function() {
    const wrapper = document.createElement("div");



    return wrapper;
  },

  //Notifications
  //Rappel : une notification est composée d'un nom (NOM_NOTIFICATION) et d'un payload (contenuNotification)

  // Gère les notifications INTERNES au module (interactions avec le node_helper)
  socketNotificationReceived: function(notification, payload) {
    switch (notification) {
      case "EVENT_INFO_FORMATTED" :
        const coordinates = payload;
        this.sendSocketNotification("FETCH_NAVITIA", "");
        break;

      case "NAVITIA_RESULT" :
        const navitia = payload;
        console.log(payload)
        break;
    }
  },

  

  //Gère les notifications inter-modules
  notificationReceived: function(notification, payload) {
    switch (notification) {
      case "CALENDAR_EVENTS":
        const event1 = payload[0];
        this.sendSocketNotification("FORMAT_EVENT_INFO", event1);
        break;
    }
  }
});
