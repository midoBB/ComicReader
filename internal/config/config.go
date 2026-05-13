package config

import (
	"os"
	"path/filepath"

	"gopkg.in/yaml.v3"
)

type Config struct {
	LibraryPath    string `yaml:"library_path"`
	Port           int    `yaml:"port"`
	Host           string `yaml:"host"`
	DBPath         string `yaml:"db_path"`
	ThumbCachePath string `yaml:"thumb_cache_path"`
}

func Load(configPath string) (*Config, error) {
	absConfig, err := filepath.Abs(configPath)
	if err != nil {
		return nil, err
	}

	data, err := os.ReadFile(absConfig)
	if err != nil {
		return nil, err
	}

	cfg := &Config{
		Port: 8386,
		Host: "0.0.0.0",
	}
	if err := yaml.Unmarshal(data, cfg); err != nil {
		return nil, err
	}
	if cfg.DBPath == "" {
		cfg.DBPath = filepath.Join(filepath.Dir(absConfig), "data.db")
	}
	if cfg.ThumbCachePath == "" {
		cfg.ThumbCachePath = filepath.Join(filepath.Dir(absConfig), "thumbcache")
	}
	return cfg, nil
}
