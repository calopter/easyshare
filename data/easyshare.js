/*
  Diaspora* Easyshare
  Copyright (C) 2013 arlo gn

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  he Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

var easyshare = {
  prefs: {},
  youtube: {},

  $: function (id) {
    return document.getElementById(id);
  },
  
  /* 
    Populate the panel
  */
  populate: function (data) {
    var range = document.createRange(),
        documentFragment = range.createContextualFragment(data.node),
        node = this.$('datanode');
        
    if (!node)
      this.$('wrapper').appendChild(documentFragment);
    else
      this.$('wrapper').replaceChild(documentFragment, node);
    
    this.$('title').value = data.title;
    this.$('url').value = data.url;
    this.$('text').value = data.text;
    this.$('tags').value = '';
    this.youtube = { video: data.video, videoUrl: data.videoUrl };
  },

  /* 
    Shorten URL via bit.ly api
  */
  shorten: function () {
    var LOGIN = this.prefs.pref_bitlylogin || "diasporaeasyshare";
    var APIKEY = this.prefs.pref_bitlyapikey || "R_5ab4e2e8e9ad46c746079a9933596bec";
    
    var url = this.$('url'),
        longURL = url.value,
        bitlyURL = "http://api.bitly.com/v3/shorten?apiKey=" + APIKEY +
                   "&login=" + LOGIN +
                   "&longUrl=" + encodeURIComponent(longURL) + 
                   "&format=json";

    var xhr = new XMLHttpRequest();

    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          var jsObj = JSON.parse(xhr.responseText);
          if (jsObj.status_txt == "OK") {
            url.value = jsObj.data.url;
          } else {
            url.value = "(" + jsObj.status_code + ") " + jsObj.status_txt;
            setTimeout(function () {
              url.value = longURL;
            }, 2000);
          }
        } else {
          url.value = "ERROR " + xhr.status;
          setTimeout(function () {
            url.value = longURL;
          }, 2000);
        }
      }
    }

    xhr.open('GET', bitlyURL, true);
    xhr.send(null);
  },
  
  /*
    Add markdown emphasis to entered text
  */
  emphasize: function () {
    var t = this.$('text'),
        s = t.value,
        re = /(\b(https?):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig,
        uiU = false;
        
    // Underscores in URLs?
    var urls = s.match(re);
    if (urls) {
      for (var i in urls) {
        if (/_/.test(urls[i])) {
          uiU = true;
          break;
        }
      }
    }
    
    if (s.length > 0 && s.indexOf('_') != 0 && !uiU)
      t.value = s.trim().replace(/[\\_\*]/g, '\\$&')
                        .replace(re, '<a href="$1">$1</a>')
                        .replace(/^([\s\S]*)$/i, '_$1_');
  },
  
  /*
    Params (@title,@url) to share images as image/title/text/tags
                                  or text-only as title/text/tags
  */
  _params: function (title, text, tags) {
    var node = this.$('datanode'),
        url = encodeURIComponent(this.$('url').value),
        params = { title: "?title=", url: "" };
        
    if (node.className != "easyshare-placeholder")
            params.title += "[![Image](" + encodeURIComponent(node.getAttribute('src')) + 
                            ")](" + url + ")<br>";
    if (title) params.title += "**" + encodeURIComponent(title) + 
                               "** <br>[" + url + "](" + url + ")<br>";    
    if (text) params.title += "<br>" + encodeURIComponent(text);
    if (tags) params.title += "<br><br>" + encodeURIComponent(tags);                   
    this.prefs && this.prefs.pref_adveasyshare ?
             params.url += "<br><sub>&url=[via Easyshare](http://j.mp/XmyxIA)</sub><br><br>" :
             params.url += "&url=<br><br>";
  	 
    return params;
  },
  
  /*
    Params (@title,@url) to share youtube videos as title/text/tags/video
  */
  _vparams: function (title, text, tags) {
    var params = { title: "?title=", url: "&url=" };
    if (title) params.title += "**" + encodeURIComponent(title) + "**";
    if (text) params.title += "<br>" + encodeURIComponent(text);
    if (tags) params.title += "<br><br>" + encodeURIComponent(tags);
    this.prefs && this.prefs.pref_adveasyshare ?
            params.title += "<br><sub>[via Easyshare](http://j.mp/XmyxIA)</sub><br><br>" :
            params.title += "<br><br>";
    params.url += this.youtube.videoUrl;
   	         
    return params;
  },

  /* 
    Send to Diaspora via the publisher bookmarklet
  */
  send: function () {
    if (this.prefs.pref_podurl == "") {
      var w = self.options.warning.replace(/\\n/g, '\n');
      return alert(w);
    }
    
    var title  = this.$('title').value,
        text   = this.$('text').value,
        tags   = this.$('tags').value,
        params = {}; 
        
    if (!title.length > 0) title = null;
    
    text.length > 0 ? text = text.replace(/\n/g, '<br>') : text = null;
    
    tags.length > 0 ? 
        tags = tags.replace(/\s+/g, '') 	 
                   .replace(/^(.+)$/g, '#$1')
                   .replace(/,/g, ' #')
                   .replace(/##/g, '#') :
        tags = null;
  	     
    this.youtube && this.youtube.video ? params = this._vparams(title, text, tags) :
                                         params = this._params(title, text, tags);                        
    
    var URL = this.prefs.pref_podurl + "/bookmarklet" + params.title + "" + params.url;

    if (!window.open(URL + "&v=1&noui=1&jump=doclose", "diasporav1",
      "location=yes,links=no,scrollbars=no,toolbar=no,width=600,height=" +
      this.prefs.pref_publisherheight.toString()))
      location.href = URL + "jump=yes";
  },
  
  /* 
    Initialize
  */
  init: function () {
    self.port.on('show', function (data) {
      easyshare.populate(data);
    });
    
    self.port.on('prefs', function (prefs) {
      easyshare.prefs = prefs;
    });
    
    this.$('send').addEventListener('click', function () { easyshare.send() }, false);
    this.$('shorturl').addEventListener('click', function (e) {
      easyshare.shorten();
      e.preventDefault();
    }, false);
    this.$('emphasis').addEventListener('click', function (e) {
      easyshare.emphasize();
      e.preventDefault();
    }, false);
  }
};

window.addEventListener('load', function () { easyshare.init() }, false);
