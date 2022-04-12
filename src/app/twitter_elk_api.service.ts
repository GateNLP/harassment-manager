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

import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, firstValueFrom, Observable } from 'rxjs';
import RateLimiter from 'rxjs-ratelimiter';
import { take } from 'rxjs/operators';

import { OauthApiService } from './oauth_api.service';
import {
  GetTweetsElkRequest,
  GetTweetsRequest,
  GetTweetsResponse
} from "../common-types";

// Number of times to retry getting Tweets after error. This is per batch.
const MAX_RETRIES = 25;

@Injectable()
export class TwitterElkApiService {
  private onTweetsLoadedSource: BehaviorSubject<number> = new BehaviorSubject(
      0
  );
  onTweetsLoaded = this.onTweetsLoadedSource.asObservable();
  // 2 requests per 1000ms.
  // Twitter's API has a limit of 2 QPS.
  private rateLimiter = new RateLimiter(2, 1000);

  constructor(
      private readonly httpClient: HttpClient,
  ) {
  }

  async getTweets(request: GetTweetsElkRequest): Promise<GetTweetsResponse> {
    const headers = new HttpHeaders();
    headers.append('Content-Type', 'application/json');

    // Continue getting more Tweets until there are no more to fetch.
    let haveFullResponse = false;
    const fullResponse: GetTweetsResponse = {tweets: []};
    let curResponse;
    let retryCount = 0;
    while (!haveFullResponse) {
      try {
        curResponse = await firstValueFrom(
            this.rateLimiter.limit(
                this.httpClient.post<GetTweetsResponse>('/get_elk_tweets', request, {
                  headers,
                })
            )
        );
      } catch (error) {
        // If there's an error with a batch, retry it up to MAX_RETRIES times.
        retryCount += 1;
        if (retryCount >= MAX_RETRIES) {
          throw new Error('Error getting Tweets');
        }
        continue;
      }
      retryCount = 0;
      fullResponse.tweets = fullResponse.tweets.concat(curResponse.tweets);

      if (curResponse.nextPageToken) {
        request.nextPageToken = curResponse.nextPageToken;
      } else {
        haveFullResponse = true;
      }
      this.onTweetsLoadedSource.next(fullResponse.tweets.length);
    }
    return fullResponse;
  }
}