import json
import os

from flask import Flask, request
from flask_cors import CORS, cross_origin

import espeak_wrapper
import iris_sapi_wrapper

app = Flask(__name__, )
cors = CORS(app, origins=['http://127.0.0.1:9200'], methods=["POSTS", "GET", "OPTIONS"])
app.config['CORS_HEADERS'] = 'Content-Type'
current_model_name='irissapi'
api_wrapper = None
current_dir = os.path.dirname(os.path.abspath(__file__))


@app.route("/{}_en".format(current_model_name), methods=['POST'])
@app.route("/{}_de".format(current_model_name), methods=['POST'])
@app.route("/{}_jp".format(current_model_name), methods=['POST'])
@app.route("/{}_zh".format(current_model_name), methods=['POST'])
@cross_origin(origins=['http://127.0.0.1:9200'])
def simple_tts():
    data = json.loads(request.data)
    other_params = data.get("other_params", {})
    found = False
    for lang_ in {"en", "de", "jp", "zh"}:
        if "/{}_{}".format(current_model_name, lang_) in request.url:
            other_params['lang'] = lang_
            found = True
    if not found:
        return {"error": "unknown language"}
    return api_wrapper.gen_mp3(data["text"], other_params)


if __name__ == '__main__':
    if current_model_name == 'irissapi':
        api_wrapper = iris_sapi_wrapper.SAPI5Wrapper()
    else:
        api_wrapper = espeak_wrapper.ESpeakWrapper()
    app.run(port=9201)
