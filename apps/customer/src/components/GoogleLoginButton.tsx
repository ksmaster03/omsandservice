import { GoogleLogin } from '@react-oauth/google';

interface Props {
  onSuccess: (idToken: string) => void;
}

export default function GoogleLoginButton({ onSuccess }: Props) {
  return (
    <div className="flex justify-center">
      <GoogleLogin
        onSuccess={(resp) => {
          if (resp.credential) onSuccess(resp.credential);
        }}
        onError={() => {
          console.error('Google sign-in failed');
        }}
        theme="filled_black"
        size="large"
        width="320"
        shape="pill"
      />
    </div>
  );
}
