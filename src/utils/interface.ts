export interface Message {
  from: string;
  to: string;
  message: string;
  sendByYou?: boolean;
}

export interface ListOfUser {
    userName: string;
    _id: string;
  }
  
