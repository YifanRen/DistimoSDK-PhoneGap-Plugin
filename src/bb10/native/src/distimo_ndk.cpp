/*
 * Copyright (c) 2013 BlackBerry Limited.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

#include <json/reader.h>
#include <curl/curl.h>
#include <curl/easy.h>
#include <sstream>
#include "distimo_js.hpp"
#include "distimo_ndk.hpp"


namespace webworks {

    // write callback for curl, look for appId & store
    size_t write_func(void *ptr, size_t size, size_t nmemb, void *userdata)
    {
      size_t total = size * nmemb;

      char * buffer = (char*) malloc (total + 1);
      memcpy(buffer, ptr, total);
      buffer[total] = '\0';

      if ( strstr (buffer, "Location: ") == buffer) {
          // Location: http://appworld.blackberry.com/webstore/content/<appId>\0xb\n
          char * ch = strrchr(buffer, '/');
          if (NULL != ch) {
            // store appId after the last '/'; \0xd\n at the end is removed
            size_t len = total - (ch - buffer) - 3;
            char ** appId = (char**)userdata;
            *appId = (char *) malloc (len+1);
            memcpy((*appId), ++ch, len);
            (*appId)[len] = '\0';
          }
      }

      free(buffer);
      return total;
    }

    std::string DistimoNDK::openAppLink(const std::string& inputString) {

        std::string ret = "";

        Json::Reader reader;
        Json::Value root;
        bool parse = reader.parse(inputString, root);

        if (!parse) {
            return ret;                  // empty
        }

        string userAgent = string("User-Agent: ") + root["userAgent"].asCString();
        const char * applkUri = root["applkUri"].asCString();

        CURL *curl;
        curl = curl_easy_init();
        if (!curl) {
            return ret;                  // empty
        }

        curl_easy_setopt(curl, CURLOPT_URL, applkUri);

        // add User-Agent in request header
        struct curl_slist *headerlist = NULL;
        headerlist = curl_slist_append(headerlist, userAgent.c_str());
        curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headerlist);

        // prevent redirection
        curl_easy_setopt(curl, CURLOPT_MAXREDIRS, 0);

        // only need "Location" in response header
        curl_easy_setopt(curl, CURLOPT_HEADER, 1);
        curl_easy_setopt(curl, CURLOPT_NOBODY, 1);

        curl_easy_setopt(curl, CURLOPT_TIMEOUT, 10);

        // write callback
        char * appId = NULL;
        curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, write_func);
        curl_easy_setopt(curl, CURLOPT_WRITEDATA, &appId);

        curl_easy_perform(curl);
        // don't care CURLE_OK or not

        if (NULL != appId){
            stringstream ss;
            ss << appId;
            ret = ss.str();
            free(appId);
        }

        curl_slist_free_all(headerlist);
        curl_easy_cleanup(curl);

        return ret;                      // <appId> or empty
    }

} /* namespace webworks */
