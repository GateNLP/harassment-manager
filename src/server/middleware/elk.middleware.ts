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
import {
    ElkHits,
    GetTweetsElkResponse,
    GetTweetsElkRequest,
    GetTweetsElkHits,
    GetTweetsResponse,
    Tweet,
    TweetObject,
    TwitterApiResponse,
} from '../../common-types';
import {TwitterElkApiService} from "../../app/twitter_elk_api.service";

// Max results per twitter call.
const BATCH_SIZE = 500;

const {Client} = require('@elastic/elasticsearch')
const client = new Client({node: "<elk-endpoint-here>"})

export async function getElkTweets(
    req: Request,
    res: Response
) {
    let twitterDataPromise: Promise<GetTweetsElkHits>;
    twitterDataPromise = loadTwitterData(req.body);

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
function loadTwitterData(request: GetTweetsElkRequest) : Promise<GetTweetsElkHits>{
    let shouldMatch: { match: { _id: string; }; }[] = []

    request.ids.forEach(id => {
        shouldMatch.push({match: {"_id": id}})
    })

    return client
        .search({
            index: 'ranaayyub_no-retweets*',
            body: {query: {bool: {should: shouldMatch}}}})
        .then((response : GetTweetsElkResponse) => response.body.hits);
}

function parseTweet(tweetObj: ElkHits): Tweet {
    // Still pass the rest of the metadata in case we want to use it
    // later, but surface the comment in a top-level field.
    //
    // Firestore doesn't support writing nested arrays, so we have to
    // manually build the Tweet object to avoid accidentally including the nested
    // arrays in the TweetObject from the Twitter API response.
    const tweetObject = tweetObj._source.entities.Tweet[0]
    const abuseObject = tweetObj._source.entities.Abuse

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
        text: tweetObject.string,
        truncated: tweetObject.truncated,
        url: `https://twitter.com/i/web/status/${tweetObject.id_str}`,
        user: tweetObject.user,
        abuse: abuseObject
    };
    if (tweetObject.truncated && tweetObject.extended_tweet) {
        tweet.text = tweetObject.extended_tweet.full_text;
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
