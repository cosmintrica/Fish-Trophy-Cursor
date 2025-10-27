# 1. Create  Mapcherry Map Token

https://client.mapcherry.io/tokens

Temporarly add  `127.0.0.1` to Allowed Origins


# 2. Set Map Token

Find all occurrences of `{{map_token}}` and replace with the map token from mapcherry.


# 3 Update the AreBaltaPeste tiles endpoint

In index.html and index-outdoor.html replace `{{username}}` and `{{dataset_key}}` with your data

## NOTE:
The url of the AreBaltaPeste tiles endpoint should be 
`https://api.mapcherry.io/tiles/{{username}}/{{dataset_key}}/{z}/{x}/{y}.pbf?key={{map_token}}`


# 4. Start local environment

Using nodejs creates a local webserver that serves the html and the style
## Install dependencies
```
npm install
```

## start the webserver
```
npm run start
```

# 5. Navigate to
http://127.0.0.1:8080/index-outdoor.html
http://127.0.0.1:8080/