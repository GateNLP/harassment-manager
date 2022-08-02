/**
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {Request, Response} from 'express';
import axios from "axios";
import {
    ElkHits,
    GetTweetsElkResponse,
    GetTweetsElkRequest,
    GetTweetsElkHits,
    GetTweetsResponse,
    Tweet,
    TweetObject,
    TwitterApiResponse, PerspectiveData,
} from '../../common-types';

// Max results per twitter call.
// const DASHBOARD_BACKEND_URL =   "http://localhost:7000";
const DASHBOARD_BACKEND_URL =   "http://dashboards:7000/";

const {Client} = require('@elastic/elasticsearch')

export async function getElkTweets(
    req: Request,
    res: Response,
    client: typeof Client
) {
    let twitterDataPromise: Promise<GetTweetsElkHits>;
    twitterDataPromise = loadTwitterData(req.body,client);

    try {
        const twitterData = await twitterDataPromise;
        const tweets = twitterData.hits.map(parseTweet);
        res.send({tweets} as GetTweetsResponse);
    } catch (e) {
        console.error('Error loading Twitter data: ' + e);
        res.status(500).send('Error loading Twitter data');
    }
}

// todo: handle case of no hits!
function loadTwitterData(request: GetTweetsElkRequest, client:typeof Client) : Promise<GetTweetsElkHits>{

    let query="";

    if (request.filterQuery) query=encodeURIComponent(request.filterQuery);

    let url = DASHBOARD_BACKEND_URL + request.screen_name + "/harassment/"+
        request.tweet_id +"/?fromDate="+request.fromDate+"&toDate="+request.toDate+"&query="+query

    return axios
        .get<GetTweetsElkResponse>(url )
        .then((response) => {
           return response.data.hits})
        .catch((error) => {
            const errorStr =
                `Error while fetching tweets with request ` +
                `${JSON.stringify(request)}: ${error}`;
            throw new Error(errorStr);
        });
}

function parseTweet(tweetObj: ElkHits): Tweet {
    // Still pass the rest of the metadata in case we want to use it
    // later, but surface the comment in a top-level field.
    //
    // Firestore doesn't support writing nested arrays, so we have to
    // manually build the Tweet object to avoid accidentally including the nested
    // arrays in the TweetObject from the Twitter API response.
    const tweetObject = tweetObj.sourceAsMap.entities.Tweet[0]
    const abuseObject = tweetObj.sourceAsMap.entities.Abuse

    const hashtags = tweetObj.sourceAsMap.entities.Hashtag?.map(hashtag=>hashtag.string)
    abuseObject.forEach(abuse=>abuse.type = abuse.type?  abuse.type.charAt(0).toUpperCase() + abuse.type.slice(1) : abuse.type)

    const tweet: Tweet = {
        created_at: tweetObject.created_at,
        date: new Date(),
        display_text_range: tweetObject.display_text_range,
        entities: tweetObject.entities,
        extended_entities: tweetObject.extended_entities,
        extended_tweet: tweetObject.extended_tweet,
        favorite_count: tweetObject.favorite_count,
        favorited: tweetObject.favorited,
        in_reply_to_status_id: tweetObject.in_reply_to_status_id,
        id_str: tweetObject.id_str,
        lang: tweetObject.lang,
        reply_count: tweetObject.reply_count,
        retweet_count: tweetObject.retweet_count,
        retweeted_status: tweetObject.retweeted_status,
        source: tweetObject.source,
        text: tweetObj.sourceAsMap.text,
        truncated: tweetObject.truncated,
        url: `https://twitter.com/i/web/status/${tweetObject.id_str}`,
        user: tweetObject.user,
        abuse: abuseObject,
        hashtags: hashtags,
    };
    if (tweetObj.sourceAsMap.persp_toxicity){
        const perspData: PerspectiveData = {
            persp_toxicity: tweetObj.sourceAsMap.persp_toxicity,
            persp_severe_toxicity: tweetObj.sourceAsMap.persp_severe_toxicity,
            persp_identity_attack: tweetObj.sourceAsMap.persp_identity_attack,
            persp_insult: tweetObj.sourceAsMap.persp_insult,
            persp_profanity: tweetObj.sourceAsMap.persp_profanity,
            persp_threat: tweetObj.sourceAsMap.persp_threat
        }
        tweet.persp_data = perspData
    }
    if (tweetObject.created_at) {
        tweet.date = new Date(tweetObject.created_at);
    }
    if (tweetObject.user) {
        tweet.authorName = tweetObject.user.name;
        tweet.authorScreenName = tweetObject.user.screen_name;
        tweet.authorUrl = `https://twitter.com/${tweetObject.user.screen_name}`;
        tweet.authorAvatarUrl = tweetObject.user.profile_image_url;
        tweet.verified = tweetObject.user.verified;
    }
    if (tweetObject.extended_entities && tweetObject.extended_entities.media) {
        tweet.hasImage = true;
    }
    return tweet;
}
