(function () {
  "use strict";
  window.FourthWall = window.FourthWall || {};
  
  FourthWall.importantUsers = [];

  FourthWall.getQueryVariables = function(search) {
    search = search || FourthWall._getLocationSearch();
    return search
      .replace(/(^\?)/,'')
      .split("&")
      .reduce( function(params, n) {
        n = n.split("=");
        params[n[0]] = n[1];
        return params;
      }, {});
  };

  FourthWall.getQueryVariable = function (name, search) {
    return FourthWall.getQueryVariables(search)[name];
  };

  FourthWall._getLocationSearch = function() {
    return window.location.search;
  };

  FourthWall.buildQueryString = function(params) {
    var param_string = $.param(params);
    if(param_string.length > 0) {
      param_string = "?" + param_string;
    }
    return param_string;
  };

  FourthWall.getToken = function (hostname) {
    var token = FourthWall.getQueryVariable(hostname+'_token');
    if (token === false && hostname == 'api.github.com') {
      token = FourthWall.getQueryVariable('token');
    }
    return token;
  };

  FourthWall.getTokenFromUrl = function (url) {
    var a = document.createElement('a');
    a.href = url;
    return FourthWall.getToken(a.hostname);
  };

  FourthWall.getTeams = function() {
    var params = FourthWall.getQueryVariables();
    return Object.keys(params).filter(function(key) {
      var match = key.match(/team$/);
      return match && match[0] == 'team';
    }).map(function(key) {
      var hostname = key.match(/^(.*?)_?team$/)[1];
      if (hostname === "") {
        hostname = "api.github.com";
      }
      var fullTeamName = stripSlash(params[key]).split('/');
      if (fullTeamName.length !== 2) {
        throw "Team name must contain a slash {org}/{team}";
      }
      return {
        org: fullTeamName[0],
        team: fullTeamName[1],
        hostname: hostname,
        baseUrl: getBaseUrlFromHostname(hostname),
      };
    });
  };

  function getBaseUrlFromHostname(hostname) {
    if (hostname === "api.github.com") {
      return "https://api.github.com";
    } else {
      return "https://" + hostname + "/api/v3";
    }
  }

  FourthWall.parseGistData = function (gistData, that) {
    var config = [];
    for (var file in gistData.data.files) {
      if (gistData.data.files.hasOwnProperty(file)) {
        var filedata = gistData.data.files[file],
        lang = filedata.language;

        if (file == 'users.json') {
          var usersFile = filedata.content
          if (usersFile) {
            FourthWall.importantUsers = JSON.parse(usersFile);
          }
        } else if (lang == 'JavaScript' || lang == 'JSON' || lang == null) {
          var configFile = JSON.parse(filedata.content);
          if (configFile) {
            config.push(configFile);
          }
        } else if (lang == 'CSS') {
          var $custom_css = $('<style>');
          $custom_css.text( filedata.content );
          $('head').append( $custom_css );
        }
      }
    }

    if (config.length > 0) {
      that.reset.call(that, config[0]);
    }
  };

  FourthWall.parseGithubFileData = function (data, that) {

    // base64 decode the bloody thing
    if (!data.content) {
      return false;
    }

    var contents = JSON.parse(
      atob(data.content)
    ).map(function (item) {
      // map to ensure gist style keys present
      // we extend the item to ensure any provided baseUrls are kept
      return $.extend(item, {
        'userName': item.owner || item.userName,
        'repo': item.name ||  item.repo
      });
    });

    that.reset.call(that, contents);
  };

  FourthWall.overrideFetch = function(url) {
    return Backbone.Model.prototype.fetch.apply(this, [{
      beforeSend: setupAuthentication(url)
    }]);
  };

  var setupAuthentication = function (baseUrl) {
    return function(xhr) {
      var token = FourthWall.getTokenFromUrl(baseUrl);
      if (token !== false && token !== '') {
        xhr.setRequestHeader('Authorization', 'token ' + token);
      }
    };
  };

  // hack for SimpleHTTPServer appending a slash
  var stripSlash = function(string){
    if (string) {
      return string.replace(/\/$/, '');
    }
  };

  FourthWall.gistId = stripSlash(
    FourthWall.getQueryVariable('gist')
  );
  FourthWall.fileUrl = stripSlash(
    FourthWall.getQueryVariable('file')
  );

})();
