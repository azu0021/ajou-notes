webpack: (config, { isServer }) => {
  if (!isServer) {
    config.resolve.alias['undici'] = false;
    config.resolve.fallback = {
      ...config.resolve.fallback,
      undici: false,
      net: false,
      tls: false,
      fs: false,
      child_process: false,
    };
  }
  return config;
},
experimental: {
  serverComponentsExternalPackages: ['undici', 'firebase', '@firebase/auth'],
},
