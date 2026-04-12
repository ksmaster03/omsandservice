import { GoogleLogin } from '@react-oauth/google';

interface Props {
  onSuccess: (idToken: string) => void;
  disabled?: boolean;
}

export default function GoogleLoginButton({ onSuccess, disabled }: Props) {
  return (
    <div className="flex justify-center" aria-disabled={disabled}>
      <GoogleLogin
        onSuccess={(resp) => {
          if (resp.credential) onSuccess(resp.credential);
        }}
        onError={() => {
          console.error('Google sign-in failed');
        }}
        useOneTap={false}
        theme="outline"
        size="large"
        width="320"
        shape="rectangular"
      />
    </div>
  );
}
