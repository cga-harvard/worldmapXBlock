
var XB = XB || {};  // global used for xblock adapter scripts

XB.queryParams = null;


(function() {
   XB.queryParams = Ext.urlDecode(location.search.substring(1));
})();

function getHost(r) {
   var a= document.createElement("A");
   a.href = r;
   return a.protocol+"//"+a.hostname+":"+(a.port ? a.port : "80")+"/";
}

/** MESSAGING is a singleton for easy access **/
XB.MESSAGING = (function() { // declare 'Singleton' as the return value of a self-executing anonymous function
    var _instance = null;
    var _constructor = function() {
        this.referringHost = getHost(document.referrer);
        this.handlers = {};
        this.uniqueId = CryptoJS.MD5(" "+location.href+(Math.random()*(new Date().getTime()))).toString(CryptoJS.enc.Base64);
        this.isMasterSlave = false;
    };
    _constructor.prototype = { // *** prototypes will be "public" methods available to the instance
        initialize: function() {
           if( this.opener && this.opener == window ) {
               this.isMasterSlave = false;
           } else {
               this.send(new Message("init", {}), true);
           }
        },
        setMasterSlave: function(b) { this.isMasterSlave = b; },
        getReferringHost: function() {
           return this.referringHost;
        },
        setOpener: function(o) {
           this.opener = o;
           if( !this.opener ) this.isMasterSlave = false;
        },
        send: function(msg, force) {
           if( (force != undefined && force == true) || this.isMasterSlave ) {
              this.opener.postMessage({xblockId:XB.queryParams.xblockId, uniqueClientId:this.uniqueId, message: msg}, this.getReferringHost());
           } else {
              console.log("not sending message: "+msg.type+", this.isMasterSlave:"+this.isMasterSlave);
           }
        },
        registerHandler: function(t,h) {
           this.handlers[t] = h;
        },
        handleMessageEvent: function(event) {
           try {
              //if not in master-slave mode, the init message echos back on us and we get it here
              if( event.data.message && event.data.message.type=="init") {
                  this.isMasterSlave = false;
              } else {
                  var data = JSON.parse(event.data);
                  if (data.type == "master-acknowledge" || this.isMasterSlave) {
                      var originHost = getHost(event.origin);
                      if (originHost == this.referringHost) { //SECURITY: we only listen to messages from our referring host
                          if (this.handlers[data.type]) {
                              try {
                                  var msg = new Message(data.type, JSON.parse(data.message)); //data.message is a JSON string
                                  this.handlers[data.type](msg);
                              } catch (e) {
                                  console.log("ERROR:  Failed to handle message - " + e + "\n" + e.stack);
                              }
                          } else {
                              console.log("ERROR:  Message ignored by slave - no handler for message type=" + data.type);
                          }
                      } else {
                          console.log("WARNING:  Message ignored by slave - originHost=" + originHost + "   - referringHost=" + this.referringHost);
                      }
                  } else {
                      console.log("WARNING: Message ignored by slave  -  message type: " + data.type + ",  isMasterSlave: " + this.isMasterSlave);
                  }
              }
           } catch(e) {  
              console.log("ERROR:  SLAVE THREW EXCEPTION WHEN HANDLING MESSAGE: "+e+"\nevent.data="+event.data);
           }
        }
    };
    return {
        // because getInstance is defined within the same scope, it can access the "private" '_instance' and '_constructor' vars
        getInstance: function() {
           if( !_instance ) {
              console.log("creating XB.MESSAGING singleton");
              _instance = new _constructor();
           }
           return _instance;
        }
    }      
})();


function Message(t,m) {
   this.type = t;
   this.message = JSON.stringify(m);
}

Message.prototype = {
    constructor: Message,
    getType: function() { return this.type; },
    getMessage: function() { return JSON.parse(this.message); },
    getMessageStr: function() { return this.message; }
};

window.addEventListener('DOMContentLoaded',
    function(event){
       console.log("DOMContentLoaded handler called");
       var parentWindow =  event.currentTarget.opener ? event.currentTarget.opener : window.parent;
       XB.MESSAGING.getInstance().setOpener(parentWindow);
       XB.MESSAGING.getInstance().registerHandler("master-acknowledge",
                            function(msg) {
                               console.log("handler for master-acknowledge called  type="+msg.getType()+",   message="+msg.getMessage());
                               if( msg.getType() === "master-acknowledge" && msg.getMessage()===XB.MESSAGING.getInstance().uniqueId) {
                                   console.log("master-acknowledge: masterSlave = true");
                                   XB.MESSAGING.getInstance().setMasterSlave(true);
//                                    XB.MESSAGING.getInstance().send(new Message("portalReady", {}));
                               }
                            });
       XB.MESSAGING.getInstance().initialize();

       window.addEventListener(
          'message',
          function(event){
             XB.MESSAGING.getInstance().handleMessageEvent(event);
          },
          false
        );
    }, false
);