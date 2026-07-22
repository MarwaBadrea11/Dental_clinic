export type RootStackParamList = {
  ServerConfig: undefined;  // shown when no backend IP is saved
  Welcome:      undefined;
  Login:        undefined;
  OTPVerify:    { phone: string };
  Register:     undefined;
  Main:         undefined;
};
