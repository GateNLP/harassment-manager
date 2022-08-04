import {Injectable} from "@angular/core";
import { environment } from '../environments/environment';
import {HttpEvent, HttpHandler, HttpInterceptor, HttpRequest} from "@angular/common/http";
import {Observable} from "rxjs";

@Injectable()
export class HttpBaseInterceptor implements HttpInterceptor {
    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        const url = '/fcdo/harassment-manager';
        req = req.clone({
            url: url + req.url
        });
        return next.handle(req)
    }
}