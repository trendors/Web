// socket.service.ts
import { io } from 'socket.io-client';
import { Observable } from 'rxjs';

const socket = io('http://localhost:6001');

export class SocketService {
  listenToNewPosts(): Observable<any> {
    return new Observable((observer) => {
      socket.on('new-post', (data) => {
        observer.next(data);
      });
    });
  }
}